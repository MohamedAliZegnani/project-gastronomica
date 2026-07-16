import type { Server, Socket } from "socket.io";
import {
  MATCH_DURATION_SEC,
  SocketEvents,
  getMapLayout,
  type DuoJoinPayload,
  type DuoLobbyState,
  type DuoPickPayload,
  type DuoPlayerVote,
  type DuoReadyPayload,
  type DuoRole,
  type MatchStartPayload,
} from "@gastronomica/shared";
import { createAuthoritySim, type AuthoritySim } from "./kitchen/createAuthoritySim.js";

type Seat = DuoPlayerVote & { socketId: string; avatarHue: number };

type DuoRoom = {
  code: string;
  phase: DuoLobbyState["phase"];
  seats: { A: Seat | null; B: Seat | null };
  countdown: number | null;
  countdownTimer: ReturnType<typeof setInterval> | null;
  kitchen: AuthoritySim | null;
  kitchenTimer: ReturnType<typeof setInterval> | null;
  seed: number;
  /** Shared wallet for this duo code. */
  coins: number;
  mapBest: Record<string, { percent: number; stars: 0 | 1 | 2 | 3 }>;
  /** Map id of the run currently in progress. */
  activeMapId: string | null;
};

function publicDuo(room: DuoRoom): DuoLobbyState {
  const strip = (s: Seat | null): DuoPlayerVote | null =>
    s
      ? {
          role: s.role,
          displayName: s.displayName,
          mapId: s.mapId,
          ready: s.ready,
          connected: s.connected,
        }
      : null;
  return {
    code: room.code,
    phase: room.phase,
    players: { A: strip(room.seats.A), B: strip(room.seats.B) },
    countdown: room.countdown,
    coins: room.coins,
    mapBest: { ...room.mapBest },
  };
}

function bothSameMap(room: DuoRoom): string | null {
  const a = room.seats.A;
  const b = room.seats.B;
  if (!a?.mapId || !b?.mapId) return null;
  if (a.mapId !== b.mapId) return null;
  return a.mapId;
}

function bothReady(room: DuoRoom) {
  return Boolean(room.seats.A?.ready && room.seats.B?.ready && bothSameMap(room));
}

/**
 * DuoArcade embed: two players already paired join with the duo code + role.
 * They must pick the same map, then both ready → shared kitchen starts.
 */
export function attachDuoLobby(io: Server) {
  const rooms = new Map<string, DuoRoom>();
  const socketRoom = new Map<string, string>();

  function emitState(room: DuoRoom) {
    io.to(`duo:${room.code}`).emit(SocketEvents.DUO_STATE, publicDuo(room));
  }

  function clearCountdown(room: DuoRoom) {
    if (room.countdownTimer) clearInterval(room.countdownTimer);
    room.countdownTimer = null;
    room.countdown = null;
  }

  function stopKitchen(room: DuoRoom) {
    if (room.kitchenTimer) clearInterval(room.kitchenTimer);
    room.kitchenTimer = null;
    room.kitchen = null;
  }

  function getOrCreate(code: string): DuoRoom {
    const key = code.trim().toUpperCase();
    let room = rooms.get(key);
    if (!room) {
      room = {
        code: key,
        phase: "lobby",
        seats: { A: null, B: null },
        countdown: null,
        countdownTimer: null,
        kitchen: null,
        kitchenTimer: null,
        seed: Math.floor(Math.random() * 1_000_000),
        coins: 0,
        mapBest: {},
        activeMapId: null,
      };
      rooms.set(key, room);
    }
    return room;
  }

  function leave(socket: Socket) {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    socketRoom.delete(socket.id);
    socket.leave(`duo:${code}`);
    if (!room) return;

    for (const role of ["A", "B"] as DuoRole[]) {
      const seat = room.seats[role];
      if (seat?.socketId === socket.id) {
        seat.connected = false;
        seat.ready = false;
        // Keep map pick so the partner still sees what they chose
        room.seats[role] = seat;
      }
    }

    if (room.phase === "lobby" || room.phase === "starting") {
      clearCountdown(room);
      room.phase = "lobby";
      if (room.seats.A) room.seats.A.ready = false;
      if (room.seats.B) room.seats.B.ready = false;
    }

    const aGone = !room.seats.A?.connected;
    const bGone = !room.seats.B?.connected;
    if (aGone && bGone) {
      clearCountdown(room);
      stopKitchen(room);
      rooms.delete(code);
      return;
    }
    emitState(room);
  }

  function beginCountdown(room: DuoRoom) {
    if (room.phase !== "lobby") return;
    if (!bothReady(room)) return;
    clearCountdown(room);
    room.phase = "starting";
    room.countdown = 3;
    emitState(room);
    room.countdownTimer = setInterval(() => {
      if (!rooms.has(room.code)) {
        clearCountdown(room);
        return;
      }
      if (room.countdown === null) return;
      room.countdown -= 1;
      if (room.countdown <= 0) {
        clearCountdown(room);
        startDuoMatch(room);
        return;
      }
      emitState(room);
    }, 1000);
  }

  function startDuoMatch(room: DuoRoom) {
    const mapId = bothSameMap(room);
    if (!mapId || !room.seats.A || !room.seats.B) {
      room.phase = "lobby";
      emitState(room);
      return;
    }
    room.phase = "playing";
    room.activeMapId = mapId;
    stopKitchen(room);

    const roster = [
      {
        id: room.seats.A.socketId,
        displayName: room.seats.A.displayName,
        avatarHue: room.seats.A.avatarHue,
        slot: 0,
      },
      {
        id: room.seats.B.socketId,
        displayName: room.seats.B.displayName,
        avatarHue: room.seats.B.avatarHue,
        slot: 1,
      },
    ];

    // Shared authoritative kitchen for every map (classic + buffet).
    const layout = getMapLayout(mapId);
    const duration = layout.matchSeconds || MATCH_DURATION_SEC;
    room.kitchen = createAuthoritySim(mapId, room.code, room.seed, duration, roster);

    const payload: MatchStartPayload = {
      code: room.code,
      seed: room.seed,
      durationSec: duration,
      startedAt: Date.now(),
      players: roster.map((r, i) => ({
        id: r.id,
        displayName: r.displayName,
        avatarHue: r.avatarHue,
        ready: true,
        slot: i,
        isHost: i === 0,
      })),
      mapId,
      authority: true,
    };
    io.to(`duo:${room.code}`).emit(SocketEvents.MATCH_START, payload);
    emitState(room);

    if (room.kitchen) {
      io.to(`duo:${room.code}`).emit(SocketEvents.MATCH_SNAPSHOT, room.kitchen.snapshot());
      let last = Date.now();
      room.kitchenTimer = setInterval(() => {
        if (!room.kitchen) {
          stopKitchen(room);
          return;
        }
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        room.kitchen.tick(dt);
        io.to(`duo:${room.code}`).emit(SocketEvents.MATCH_SNAPSHOT, room.kitchen.snapshot());
        if (room.kitchen.ended) {
          const snap = room.kitchen.snapshot();
          const performancePercent = Math.round(
            Math.max(
              0,
              Math.min(
                100,
                Math.min(50, (snap.score / 1000) * 50) +
                  Math.min(25, (snap.served / 8) * 25) +
                  Math.min(10, (snap.tips / 180) * 10) +
                  Math.min(15, ((snap.combo ?? 0) / 8) * 15) -
                  snap.walkouts * 6 -
                  snap.burns * 2.5,
              ),
            ),
          );
          const endStars: 0 | 1 | 2 | 3 =
            performancePercent >= 100
              ? 3
              : performancePercent >= 70
                ? 2
                : performancePercent >= 40
                  ? 1
                  : 0;
          const coinsEarned = Math.max(
            0,
            Math.floor(snap.score / 20) +
              Math.floor(snap.tips / 2) +
              snap.served * 5 +
              endStars * 10 +
              Math.min(16, (snap.combo ?? 0) * 2),
          );
          // Shared wallet — apply once for the duo
          room.coins += coinsEarned;
          const mid = room.activeMapId ?? mapId;
          const prev = room.mapBest[mid];
          if (!prev || performancePercent > prev.percent) {
            room.mapBest[mid] = { percent: performancePercent, stars: endStars };
          }
          io.to(`duo:${room.code}`).emit(SocketEvents.MATCH_END, {
            code: room.code,
            mapId: mid,
            score: snap.score,
            served: snap.served,
            walkouts: snap.walkouts,
            tips: snap.tips,
            burns: snap.burns,
            stars: endStars,
            performancePercent,
            coinsEarned,
            coinsTotal: room.coins,
            mapBest: room.mapBest,
          });
          room.phase = "lobby";
          room.activeMapId = null;
          if (room.seats.A) room.seats.A.ready = false;
          if (room.seats.B) room.seats.B.ready = false;
          stopKitchen(room);
          emitState(room);
        }
      }, 50);
    }
  }

  io.on("connection", (socket) => {
    socket.on(SocketEvents.DUO_JOIN, (payload: DuoJoinPayload) => {
      const code = String(payload?.code ?? "")
        .trim()
        .toUpperCase();
      const role = payload?.role === "B" ? "B" : "A";
      if (!code || code.length < 3) {
        socket.emit(SocketEvents.DUO_ERROR, { message: "Missing duo code." });
        return;
      }
      leave(socket);
      const room = getOrCreate(code);
      if (room.phase === "playing") {
        socket.emit(SocketEvents.DUO_ERROR, { message: "Match already in progress." });
        return;
      }
      const existing = room.seats[role];
      if (existing?.connected && existing.socketId !== socket.id) {
        socket.emit(SocketEvents.DUO_ERROR, { message: `Seat ${role} is already taken.` });
        return;
      }
      room.phase = "lobby";
      clearCountdown(room);
      // Rejoining keeps previous map pick; ready resets
      room.seats[role] = {
        role,
        displayName: (payload.displayName || `Chef ${role}`).slice(0, 24),
        mapId: existing?.mapId ?? null,
        ready: false,
        connected: true,
        socketId: socket.id,
        avatarHue: Number.isFinite(payload.avatarHue) ? Number(payload.avatarHue) % 360 : role === "A" ? 140 : 200,
      };
      if (room.seats.A && room.seats.A.role !== role) room.seats.A.ready = false;
      if (room.seats.B && room.seats.B.role !== role) room.seats.B.ready = false;

      socketRoom.set(socket.id, code);
      socket.join(`duo:${code}`);
      emitState(room);
    });

    socket.on(SocketEvents.DUO_PICK, (payload: DuoPickPayload) => {
      const code = socketRoom.get(socket.id);
      const room = code ? rooms.get(code) : undefined;
      if (!room || room.phase === "playing") return;
      const mapId = String(payload?.mapId ?? "");
      if (!mapId) return;
      for (const role of ["A", "B"] as DuoRole[]) {
        const seat = room.seats[role];
        if (seat?.socketId !== socket.id) continue;
        seat.mapId = mapId;
        seat.ready = false;
        // Changing map clears partner ready
        const other = role === "A" ? room.seats.B : room.seats.A;
        if (other) other.ready = false;
        clearCountdown(room);
        room.phase = "lobby";
        emitState(room);
        return;
      }
    });

    socket.on(SocketEvents.DUO_READY, (payload: DuoReadyPayload) => {
      const code = socketRoom.get(socket.id);
      const room = code ? rooms.get(code) : undefined;
      if (!room || room.phase === "playing") return;
      for (const role of ["A", "B"] as DuoRole[]) {
        const seat = room.seats[role];
        if (seat?.socketId !== socket.id) continue;
        if (!seat.mapId) {
          socket.emit(SocketEvents.DUO_ERROR, { message: "Pick a map first." });
          return;
        }
        const agreed = bothSameMap(room);
        if (payload?.ready && !agreed) {
          socket.emit(SocketEvents.DUO_ERROR, {
            message: "Both players must choose the same map before ready.",
          });
          return;
        }
        seat.ready = Boolean(payload?.ready);
        emitState(room);
        if (bothReady(room)) beginCountdown(room);
        else {
          clearCountdown(room);
          room.phase = "lobby";
          emitState(room);
        }
        return;
      }
    });

    socket.on(SocketEvents.DUO_LEAVE, () => leave(socket));

    socket.on(SocketEvents.MATCH_INPUT, (input) => {
      const code = socketRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room?.kitchen || room.phase !== "playing") return;
      room.kitchen.setInput(socket.id, input ?? { ax: 0, ay: 0, sprint: false, interact: false, drop: false });
    });

    socket.on("disconnect", () => leave(socket));
  });
}
