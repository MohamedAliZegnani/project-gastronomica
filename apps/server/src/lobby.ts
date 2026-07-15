import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  LOBBY_MAX_PLAYERS,
  MATCH_DURATION_SEC,
  QUICK_MATCH_MIN,
  SocketEvents,
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

  function leaveRoom(socket: Socket, opts: { silent?: boolean } = {}) {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    socketRoom.delete(socket.id);
    socket.leave(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    room.players.delete(socket.id);

    if (room.players.size === 0) {
      clearCountdown(room);
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
    const payload: MatchStartPayload = {
      code: room.code,
      seed: room.seed,
      durationSec: MATCH_DURATION_SEC,
      startedAt: Date.now(),
      players: publicState(room).players,
    };
    io.to(room.code).emit(SocketEvents.MATCH_START, payload);
    emitState(room);
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
      const code = socketRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "playing") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      socket.to(code).emit(SocketEvents.PLAYER_STATE, {
        ...state,
        id: player.id,
      });
    });

    socket.on("disconnect", () => {
      leaveRoom(socket);
      removeFromQueue(socket.id);
    });
  });
}
