import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import {
  SocketEvents,
  type KitchenInput,
  type KitchenSnapshot,
  type LobbyState,
  type MatchEndPayload,
  type MatchmakingStatus,
  type MatchStartPayload,
  type PlayerNetState,
} from "@gastronomica/shared";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? undefined : window.location.origin);

type LobbyStore = {
  socket: Socket | null;
  connected: boolean;
  lobby: LobbyState | null;
  match: MatchStartPayload | null;
  matchmaking: MatchmakingStatus | null;
  error: string | null;
  remotePlayers: Record<string, PlayerNetState>;
  snapshot: KitchenSnapshot | null;
  matchEnd: MatchEndPayload | null;
  connect: () => Socket;
  disconnect: () => void;
  clearError: () => void;
  createPrivate: (displayName: string, avatarHue: number) => void;
  joinPrivate: (code: string, displayName: string, avatarHue: number) => void;
  leaveLobby: () => void;
  setReady: (ready: boolean) => void;
  startMatch: () => void;
  findMatch: (displayName: string, avatarHue: number) => void;
  cancelMatchmaking: () => void;
  sendPlayerState: (state: Omit<PlayerNetState, "id"> & { id?: string }) => void;
  sendKitchenInput: (input: KitchenInput) => void;
  clearMatch: () => void;
};

function bindSocket(socket: Socket, set: (partial: Partial<LobbyStore>) => void, get: () => LobbyStore) {
  socket.on("connect", () => set({ connected: true, error: null }));
  socket.on("disconnect", () => set({ connected: false }));

  socket.on(SocketEvents.LOBBY_STATE, (lobby: LobbyState) => {
    set({ lobby, error: null, matchmaking: null });
  });

  socket.on(SocketEvents.LOBBY_ERROR, (payload: { message: string }) => {
    set({ error: payload.message });
  });

  socket.on(SocketEvents.MATCH_STATUS, (status: MatchmakingStatus) => {
    set({ matchmaking: status });
  });

  socket.on(SocketEvents.MATCH_START, (match: MatchStartPayload) => {
    set({
      match: {
        ...match,
        mapId: match.mapId ?? "diner-1",
        authority: match.authority ?? true,
      },
      remotePlayers: {},
      snapshot: null,
      matchEnd: null,
      lobby: get().lobby ? { ...get().lobby!, phase: "playing" } : null,
    });
  });

  socket.on(SocketEvents.MATCH_SNAPSHOT, (snapshot: KitchenSnapshot) => {
    set({ snapshot });
  });

  socket.on(SocketEvents.MATCH_END, (matchEnd: MatchEndPayload) => {
    set({ matchEnd, snapshot: get().snapshot ? { ...get().snapshot!, ended: true } : null });
  });

  socket.on(SocketEvents.PLAYER_STATE, (state: PlayerNetState) => {
    const selfId = get().socket?.id;
    if (!selfId || state.id === selfId) return;
    set({
      remotePlayers: {
        ...get().remotePlayers,
        [state.id]: state,
      },
    });
  });

  socket.on(SocketEvents.PLAYER_LEFT, (payload: { id: string }) => {
    const next = { ...get().remotePlayers };
    delete next[payload.id];
    const lobby = get().lobby;
    const match = get().match;
    set({
      remotePlayers: next,
      lobby: lobby
        ? { ...lobby, players: lobby.players.filter((p) => p.id !== payload.id) }
        : null,
      match: match
        ? { ...match, players: match.players.filter((p) => p.id !== payload.id) }
        : null,
    });
  });
}

export const useLobbyStore = create<LobbyStore>((set, get) => ({
  socket: null,
  connected: false,
  lobby: null,
  match: null,
  matchmaking: null,
  error: null,
  remotePlayers: {},
  snapshot: null,
  matchEnd: null,

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return existing;
    if (existing) {
      existing.connect();
      return existing;
    }
    const socket = io(SOCKET_URL ?? "/", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    bindSocket(socket, set, get);
    set({ socket });
    return socket;
  },

  disconnect: () => {
    const { socket } = get();
    socket?.removeAllListeners();
    socket?.disconnect();
    set({
      socket: null,
      connected: false,
      lobby: null,
      match: null,
      matchmaking: null,
      remotePlayers: {},
      snapshot: null,
      matchEnd: null,
    });
  },

  clearError: () => set({ error: null }),

  createPrivate: (displayName, avatarHue) => {
    const socket = get().connect();
    set({ match: null, remotePlayers: {}, snapshot: null, matchEnd: null, error: null });
    socket.emit(SocketEvents.LOBBY_CREATE, { displayName, avatarHue });
  },

  joinPrivate: (code, displayName, avatarHue) => {
    const socket = get().connect();
    set({ match: null, remotePlayers: {}, snapshot: null, matchEnd: null, error: null });
    socket.emit(SocketEvents.LOBBY_JOIN, { code, displayName, avatarHue });
  },

  leaveLobby: () => {
    const { socket } = get();
    socket?.emit(SocketEvents.LOBBY_LEAVE);
    set({
      lobby: null,
      match: null,
      matchmaking: null,
      remotePlayers: {},
      snapshot: null,
      matchEnd: null,
    });
  },

  setReady: (ready) => {
    get().socket?.emit(SocketEvents.LOBBY_READY, { ready });
  },

  startMatch: () => {
    get().socket?.emit(SocketEvents.LOBBY_START);
  },

  findMatch: (displayName, avatarHue) => {
    const socket = get().connect();
    set({
      lobby: null,
      match: null,
      error: null,
      remotePlayers: {},
      snapshot: null,
      matchEnd: null,
    });
    socket.emit(SocketEvents.MATCH_FIND, { displayName, avatarHue });
  },

  cancelMatchmaking: () => {
    get().socket?.emit(SocketEvents.MATCH_CANCEL);
    set({ matchmaking: null });
  },

  sendPlayerState: (state) => {
    const socket = get().socket;
    if (!socket?.id) return;
    socket.emit(SocketEvents.PLAYER_STATE, { ...state, id: socket.id });
  },

  sendKitchenInput: (input) => {
    get().socket?.emit(SocketEvents.MATCH_INPUT, input);
  },

  clearMatch: () => set({ match: null, remotePlayers: {}, snapshot: null, matchEnd: null }),
}));

export function useSelfId() {
  return useLobbyStore((s) => s.socket?.id ?? null);
}
