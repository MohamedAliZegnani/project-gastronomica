import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  LOBBY_MAX_PLAYERS,
  MATCH_DURATION_SEC,
  QUICK_MATCH_MIN,
  SocketEvents,
  getMapLayout,
  type KitchenInput,
  type LobbyCreatePayload,
  type LobbyJoinPayload,
  type LobbyMode,
  type LobbyPhase,
  type LobbyPlayer,
  type LobbyReadyPayload,
  type LobbyState,
  type MatchFindPayload,
  type MatchStartPayload,
  type PlayerNetState,
} from "@gastronomica/shared";
import { createAuthoritySim, type AuthoritySim } from "./kitchen/createAuthoritySim.js";

type RoomPlayer = LobbyPlayer & {
  socketId: string;
};

type Room = {
  code: string;
  mode: LobbyMode;
  phase: LobbyPhase;
  hostId: string;
  players: Map<string, RoomPlayer>;
  countdown: number | null;
  countdownTimer: ReturnType<typeof setInterval> | null;
  seed: number;
  kitchen: AuthoritySim | null;
  kitchenTimer: ReturnType<typeof setInterval> | null;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  let out = "";
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) out += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  return out;
}

function publicState(room: Room): LobbyState {
  return {
    code: room.code,
    phase: room.phase,
    mode: room.mode,
    players: [...room.players.values()]
      .sort((a, b) => a.slot - b.slot)
      .map(({ id, displayName, avatarHue, ready, slot, isHost }) => ({
        id,
        displayName,
        avatarHue,
        ready,
        slot,
        isHost,
      })),
    maxPlayers: LOBBY_MAX_PLAYERS,
    hostId: room.hostId,
    countdown: room.countdown,
  };
}

function nextSlot(room: Room): number {
  const used = new Set([...room.players.values()].map((p) => p.slot));
  for (let i = 0; i < LOBBY_MAX_PLAYERS; i++) {
    if (!used.has(i)) return i;
  }
  return 0;
}

export function attachLobby(io: Server) {
  const rooms = new Map<string, Room>();
  const socketRoom = new Map<string, string>();
  const queue: { socketId: string; displayName: string; avatarHue: number }[] = [];

  function emitState(room: Room) {
    io.to(room.code).emit(SocketEvents.LOBBY_STATE, publicState(room));
  }

  function clearCountdown(room: Room) {
    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
    }
    room.countdown = null;
  }

  function stopKitchen(room: Room) {
    if (room.kitchenTimer) {
      clearInterval(room.kitchenTimer);
      room.kitchenTimer = null;
    }
    room.kitchen = null;
  }

  function leaveRoom(socket: Socket, opts: { silent?: boolean } = {}) {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    socketRoom.delete(socket.id);
    socket.leave(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    room.players.delete(socket.id);
    room.kitchen?.removePlayer(socket.id);

    if (room.players.size === 0) {
      clearCountdown(room);
      stopKitchen(room);
      rooms.delete(code);
      return;
    }

    if (player && room.hostId === player.id) {
      const next = [...room.players.values()][0]!;
      room.hostId = next.id;
      for (const p of room.players.values()) {
        p.isHost = p.id === next.id;
      }
    }

    if (room.phase === "lobby" || room.phase === "starting") {
      clearCountdown(room);
      room.phase = "lobby";
      for (const p of room.players.values()) p.ready = false;
    }

    if (!opts.silent) {
      emitState(room);
      if (player) {
        socket.to(code).emit(SocketEvents.PLAYER_LEFT, { id: player.id });
      }
    }
  }

  function createRoom(mode: LobbyMode): Room {
    let code = makeCode();
    while (rooms.has(code)) code = makeCode();
    const room: Room = {
      code,
      mode,
      phase: "lobby",
      hostId: "",
      players: new Map(),
      countdown: null,
      countdownTimer: null,
      seed: Math.floor(Math.random() * 1_000_000),
      kitchen: null,
      kitchenTimer: null,
    };
    rooms.set(code, room);
    return room;
  }

  function addPlayer(
    room: Room,
    socket: Socket,
    displayName: string,
    avatarHue: number,
  ): RoomPlayer | null {
    if (room.phase !== "lobby" && room.phase !== "starting") return null;
    if (room.players.size >= LOBBY_MAX_PLAYERS) return null;

    const id = socket.id;
    const isFirst = room.players.size === 0;
    const player: RoomPlayer = {
      id,
      socketId: socket.id,
      displayName: displayName.trim().slice(0, 24) || "Chef",
      avatarHue: Number.isFinite(avatarHue) ? avatarHue % 360 : 140,
      ready: false,
      slot: nextSlot(room),
      isHost: isFirst,
    };
    if (isFirst) room.hostId = id;
    room.players.set(socket.id, player);
    socketRoom.set(socket.id, room.code);
    socket.join(room.code);
    return player;
  }

  function beginCountdown(room: Room) {
    if (room.phase !== "lobby") return;
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
        startMatch(room);
        return;
      }
      emitState(room);
    }, 1000);
  }

  function startMatch(room: Room) {
    room.phase = "playing";
    room.countdown = null;
    stopKitchen(room);

    const roster = [...room.players.values()]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        avatarHue: p.avatarHue,
        slot: p.slot,
      }));

    const layout = getMapLayout("diner-1");
    const duration = layout.matchSeconds || MATCH_DURATION_SEC;
    const kitchen = createAuthoritySim("diner-1", room.code, room.seed, duration, roster);
    room.kitchen = kitchen;

    const payload: MatchStartPayload = {
      code: room.code,
      seed: room.seed,
      durationSec: duration,
      startedAt: Date.now(),
      players: publicState(room).players,
      mapId: "diner-1",
      authority: true,
    };
    io.to(room.code).emit(SocketEvents.MATCH_START, payload);
    emitState(room);

    // Immediate first snapshot, then 20 Hz
    io.to(room.code).emit(SocketEvents.MATCH_SNAPSHOT, kitchen.snapshot());
    let last = Date.now();
    room.kitchenTimer = setInterval(() => {
      if (!rooms.has(room.code) || !room.kitchen) {
        stopKitchen(room);
        return;
      }
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      room.kitchen.tick(dt);
      io.to(room.code).emit(SocketEvents.MATCH_SNAPSHOT, room.kitchen.snapshot());
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
                Math.min(15, (snap.combo / 8) * 15) -
                snap.walkouts * 6 -
                snap.burns * 2.5,
            ),
          ),
        );
        const endStars: 0 | 1 | 2 | 3 =
          performancePercent >= 100 ? 3 : performancePercent >= 70 ? 2 : performancePercent >= 40 ? 1 : 0;
        io.to(room.code).emit(SocketEvents.MATCH_END, {
          code: room.code,
          score: snap.score,
          served: snap.served,
          walkouts: snap.walkouts,
          tips: snap.tips,
          burns: snap.burns,
          stars: endStars,
          performancePercent,
        });
        room.phase = "ended";
        stopKitchen(room);
        emitState(room);
      }
    }, 50);
  }

  function tryAutoStart(room: Room) {
    if (room.phase !== "lobby") return;
    const players = [...room.players.values()];
    if (players.length < 1) return;
    if (!players.every((p) => p.ready)) return;
    if (room.mode === "quick" && players.length < QUICK_MATCH_MIN) return;
    beginCountdown(room);
  }

  function flushQueue() {
    while (queue.length >= QUICK_MATCH_MIN) {
      const batch = queue.splice(0, Math.min(LOBBY_MAX_PLAYERS, queue.length));
      if (batch.length < QUICK_MATCH_MIN) {
        queue.unshift(...batch);
        break;
      }
      const room = createRoom("quick");
      for (const entry of batch) {
        const sock = io.sockets.sockets.get(entry.socketId);
        if (!sock || socketRoom.has(sock.id)) continue;
        addPlayer(room, sock, entry.displayName, entry.avatarHue);
      }
      if (room.players.size < QUICK_MATCH_MIN) {
        for (const p of room.players.values()) {
          const sock = io.sockets.sockets.get(p.socketId);
          if (sock) {
            socketRoom.delete(sock.id);
            sock.leave(room.code);
            queue.push({
              socketId: sock.id,
              displayName: p.displayName,
              avatarHue: p.avatarHue,
            });
          }
        }
        rooms.delete(room.code);
        continue;
      }
      emitState(room);
      broadcastQueue();
    }
    broadcastQueue();
  }

  function broadcastQueue() {
    const status = { searching: true, queueSize: queue.length };
    for (const q of queue) {
      io.to(q.socketId).emit(SocketEvents.MATCH_STATUS, status);
    }
  }

  function removeFromQueue(socketId: string) {
    const idx = queue.findIndex((q) => q.socketId === socketId);
    if (idx >= 0) queue.splice(idx, 1);
    broadcastQueue();
  }

  io.on("connection", (socket) => {
    socket.on(SocketEvents.PING, () => {
      socket.emit(SocketEvents.PONG, { at: Date.now() });
    });

    socket.on(SocketEvents.LOBBY_CREATE, (payload: LobbyCreatePayload) => {
      leaveRoom(socket, { silent: true });
      removeFromQueue(socket.id);
      const room = createRoom("private");
      addPlayer(room, socket, payload?.displayName ?? "Chef", payload?.avatarHue ?? 140);
      emitState(room);
    });

    socket.on(SocketEvents.LOBBY_JOIN, (payload: LobbyJoinPayload) => {
      const code = String(payload?.code ?? "")
        .trim()
        .toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        socket.emit(SocketEvents.LOBBY_ERROR, { message: "Room not found." });
        return;
      }
      if (room.phase === "playing" || room.phase === "ended") {
        socket.emit(SocketEvents.LOBBY_ERROR, { message: "Match already in progress." });
        return;
      }
      if (room.players.size >= LOBBY_MAX_PLAYERS) {
        socket.emit(SocketEvents.LOBBY_ERROR, { message: "Room is full." });
        return;
      }
      leaveRoom(socket, { silent: true });
      removeFromQueue(socket.id);
      clearCountdown(room);
      room.phase = "lobby";
      for (const p of room.players.values()) p.ready = false;
      addPlayer(room, socket, payload?.displayName ?? "Chef", payload?.avatarHue ?? 140);
      emitState(room);
    });

    socket.on(SocketEvents.LOBBY_LEAVE, () => {
      leaveRoom(socket);
      removeFromQueue(socket.id);
    });

    socket.on(SocketEvents.LOBBY_READY, (payload: LobbyReadyPayload) => {
      const code = socketRoom.get(socket.id);
      const room = code ? rooms.get(code) : undefined;
      const player = room?.players.get(socket.id);
      if (!room || !player || room.phase !== "lobby") return;
      player.ready = Boolean(payload?.ready);
      emitState(room);
      tryAutoStart(room);
    });

    socket.on(SocketEvents.LOBBY_START, () => {
      const code = socketRoom.get(socket.id);
      const room = code ? rooms.get(code) : undefined;
      const player = room?.players.get(socket.id);
      if (!room || !player || !player.isHost) {
        socket.emit(SocketEvents.LOBBY_ERROR, { message: "Only the host can start." });
        return;
      }
      if (room.phase !== "lobby") return;
      const players = [...room.players.values()];
      if (players.length < 1) return;
      if (!players.every((p) => p.ready)) {
        socket.emit(SocketEvents.LOBBY_ERROR, {
          message: "Everyone must ready up first.",
        });
        return;
      }
      beginCountdown(room);
    });

    socket.on(SocketEvents.MATCH_FIND, (payload: MatchFindPayload) => {
      leaveRoom(socket, { silent: true });
      removeFromQueue(socket.id);
      queue.push({
        socketId: socket.id,
        displayName: payload?.displayName ?? "Chef",
        avatarHue: payload?.avatarHue ?? 140,
      });
      socket.emit(SocketEvents.MATCH_STATUS, {
        searching: true,
        queueSize: queue.length,
      });
      flushQueue();
    });

    socket.on(SocketEvents.MATCH_CANCEL, () => {
      removeFromQueue(socket.id);
      socket.emit(SocketEvents.MATCH_STATUS, { searching: false, queueSize: 0 });
    });

    socket.on(SocketEvents.PLAYER_STATE, (state: PlayerNetState) => {
      // Legacy avatar-only sync — ignored when authority kitchen is running
      const code = socketRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "playing" || room.kitchen) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      socket.to(code).emit(SocketEvents.PLAYER_STATE, {
        ...state,
        id: player.id,
      });
    });

    socket.on(SocketEvents.MATCH_INPUT, (input: KitchenInput) => {
      const code = socketRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room?.kitchen || room.phase !== "playing") return;
      room.kitchen.setInput(socket.id, input ?? { ax: 0, ay: 0, sprint: false, interact: false, drop: false });
    });

    socket.on("disconnect", () => {
      leaveRoom(socket);
      removeFromQueue(socket.id);
    });
  });
}
