import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GameCanvas } from "../components/GameCanvas";
import { Avatar, Button, Card, Input, PageHeader } from "../components/ui";
import { useAuthStore } from "../stores/authStore";
import { useLobbyStore } from "../stores/lobbyStore";
import type { MultiplayerBridge } from "../game/createGame";
import type { MapId } from "../game/maps/catalog";

function useChefIdentity() {
  const user = useAuthStore((s) => s.user);
  return useMemo(
    () => ({
      displayName: user?.displayName ?? "Chef",
      avatarHue: user?.avatarHue ?? 140,
    }),
    [user],
  );
}

export function QuickMatchPage() {
  const navigate = useNavigate();
  const identity = useChefIdentity();
  const connect = useLobbyStore((s) => s.connect);
  const findMatch = useLobbyStore((s) => s.findMatch);
  const cancelMatchmaking = useLobbyStore((s) => s.cancelMatchmaking);
  const leaveLobby = useLobbyStore((s) => s.leaveLobby);
  const matchmaking = useLobbyStore((s) => s.matchmaking);
  const lobby = useLobbyStore((s) => s.lobby);
  const match = useLobbyStore((s) => s.match);
  const connected = useLobbyStore((s) => s.connected);
  const error = useLobbyStore((s) => s.error);

  useEffect(() => {
    connect();
    return () => {
      cancelMatchmaking();
    };
  }, [connect, cancelMatchmaking]);

  useEffect(() => {
    if (lobby?.code) navigate(`/play/lobby/${lobby.code}`, { replace: true });
  }, [lobby?.code, navigate]);

  useEffect(() => {
    if (match?.code) navigate(`/play/match/${match.code}`, { replace: true });
  }, [match?.code, navigate]);

  const searching = Boolean(matchmaking?.searching);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Quick Match"
          subtitle="Queue for a public co-op kitchen (2–4 chefs)."
        />
        <Link to="/play">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <Card className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          <Avatar name={identity.displayName} hue={identity.avatarHue} size="lg" />
          <div>
            <p className="font-bold">{identity.displayName}</p>
            <p className="text-sm text-[color:var(--color-muted)]">
              {connected ? "Connected to kitchen network" : "Connecting…"}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-900/30 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        {searching ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-lg font-bold text-[color:var(--color-accent)]">Searching…</p>
            <p className="text-sm text-[color:var(--color-muted)]">
              Queue size: {matchmaking?.queueSize ?? 1}
            </p>
            <Button
              variant="danger"
              onClick={() => {
                cancelMatchmaking();
                leaveLobby();
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            className="mt-6 w-full"
            onClick={() => findMatch(identity.displayName, identity.avatarHue)}
            disabled={!connected}
          >
            Find match
          </Button>
        )}
      </Card>
    </div>
  );
}

export function PrivateMatchPage() {
  const navigate = useNavigate();
  const identity = useChefIdentity();
  const connect = useLobbyStore((s) => s.connect);
  const createPrivate = useLobbyStore((s) => s.createPrivate);
  const joinPrivate = useLobbyStore((s) => s.joinPrivate);
  const lobby = useLobbyStore((s) => s.lobby);
  const connected = useLobbyStore((s) => s.connected);
  const error = useLobbyStore((s) => s.error);
  const clearError = useLobbyStore((s) => s.clearError);
  const [code, setCode] = useState("");

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (lobby?.code) navigate(`/play/lobby/${lobby.code}`, { replace: true });
  }, [lobby?.code, navigate]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Private Match"
          subtitle="Create a room code or join a friend’s kitchen."
        />
        <Link to="/play">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Create room</h2>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Host a private lobby and share the 4-letter code.
          </p>
          <Button
            className="mt-4 w-full"
            disabled={!connected}
            onClick={() => {
              clearError();
              createPrivate(identity.displayName, identity.avatarHue);
            }}
          >
            Create kitchen
          </Button>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Join room</h2>
          <div className="mt-3">
            <Input
              label="Room code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              autoComplete="off"
            />
          </div>
          <Button
            className="mt-4 w-full"
            disabled={!connected || code.trim().length < 4}
            onClick={() => {
              clearError();
              joinPrivate(code.trim(), identity.displayName, identity.avatarHue);
            }}
          >
            Join
          </Button>
        </Card>
      </div>

      {error && (
        <p className="mx-auto mt-4 max-w-3xl rounded-xl border border-red-500/30 bg-red-900/30 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}
      {!connected && (
        <p className="mt-4 text-center text-sm text-[color:var(--color-muted)]">Connecting…</p>
      )}
    </div>
  );
}

export function LobbyRoomPage() {
  const navigate = useNavigate();
  const lobby = useLobbyStore((s) => s.lobby);
  const match = useLobbyStore((s) => s.match);
  const error = useLobbyStore((s) => s.error);
  const setReady = useLobbyStore((s) => s.setReady);
  const startMatch = useLobbyStore((s) => s.startMatch);
  const leaveLobby = useLobbyStore((s) => s.leaveLobby);
  const socketId = useLobbyStore((s) => s.socket?.id);
  const connected = useLobbyStore((s) => s.connected);

  useEffect(() => {
    if (match?.code) navigate(`/play/match/${match.code}`, { replace: true });
  }, [match?.code, navigate]);

  useEffect(() => {
    if (!lobby && connected) {
      // left or never joined
    }
  }, [lobby, connected]);

  if (!lobby) {
    return (
      <div>
        <PageHeader title="Lobby" subtitle="No active room." />
        <Link to="/play">
          <Button className="mt-4">Back to play</Button>
        </Link>
      </div>
    );
  }

  const self = lobby.players.find((p) => p.id === socketId);
  const allReady = lobby.players.every((p) => p.ready);
  const canStart = Boolean(self?.isHost && allReady && lobby.phase === "lobby");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title={`Room ${lobby.code}`}
          subtitle={
            lobby.phase === "starting"
              ? `Starting in ${lobby.countdown ?? 0}…`
              : lobby.mode === "quick"
                ? "Quick match lobby — ready up to begin"
                : "Private lobby — ready up, then host starts"
          }
        />
        <Button
          variant="secondary"
          onClick={() => {
            leaveLobby();
            navigate("/play");
          }}
        >
          Leave
        </Button>
      </div>

      <Card className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-[color:var(--color-accent)]">
            {lobby.code}
          </p>
          <Button
            variant="ghost"
            onClick={() => void navigator.clipboard?.writeText(lobby.code)}
          >
            Copy code
          </Button>
        </div>

        <ul className="space-y-3">
          {lobby.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0f1a14]/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.displayName} hue={p.avatarHue} />
                <div>
                  <p className="font-bold">
                    {p.displayName}
                    {p.isHost ? " · Host" : ""}
                    {p.id === socketId ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-[color:var(--color-muted)]">Slot {p.slot + 1}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  p.ready
                    ? "bg-emerald-900/50 text-emerald-200"
                    : "bg-white/10 text-[color:var(--color-muted)]"
                }`}
              >
                {p.ready ? "Ready" : "Waiting"}
              </span>
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-900/30 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        {lobby.phase === "starting" ? (
          <p className="mt-6 text-center text-2xl font-bold text-[color:var(--color-accent)]">
            {lobby.countdown}
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="flex-1"
              variant={self?.ready ? "secondary" : "primary"}
              onClick={() => setReady(!self?.ready)}
            >
              {self?.ready ? "Unready" : "Ready up"}
            </Button>
            {self?.isHost && (
              <Button className="flex-1" disabled={!canStart} onClick={() => startMatch()}>
                Start match
              </Button>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-[color:var(--color-muted)]">
          {lobby.mode === "quick"
            ? "Quick match auto-starts when everyone is ready."
            : "Host can start once everyone is ready (solo host OK)."}
        </p>
      </Card>
    </div>
  );
}

export function MultiplayerMatchPage() {
  const navigate = useNavigate();
  const match = useLobbyStore((s) => s.match);
  const lobby = useLobbyStore((s) => s.lobby);
  const socketId = useLobbyStore((s) => s.socket?.id);
  const sendPlayerState = useLobbyStore((s) => s.sendPlayerState);
  const leaveLobby = useLobbyStore((s) => s.leaveLobby);
  const clearMatch = useLobbyStore((s) => s.clearMatch);

  const peers = match?.players ?? lobby?.players ?? [];
  const bridge: MultiplayerBridge | undefined =
    match && socketId
      ? {
          localId: socketId,
          peers,
          getPeers: () =>
            useLobbyStore.getState().match?.players ??
            useLobbyStore.getState().lobby?.players ??
            peers,
          sendState: sendPlayerState,
          getRemotes: () => useLobbyStore.getState().remotePlayers,
          authority: match.authority ?? true,
          mapId: match.mapId ?? "diner-1",
          sendInput: (input) => useLobbyStore.getState().sendKitchenInput(input),
          getSnapshot: () => useLobbyStore.getState().snapshot,
        }
      : undefined;

  if (!match || !socketId || !bridge) {
    return (
      <div>
        <PageHeader title="Match" subtitle="No active match." />
        <Link to="/play">
          <Button className="mt-4">Back to play</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title={`Match ${match.code}`}
          subtitle={`${peers.length} chefs · shared kitchen (server)`}
        />
        <Button
          variant="secondary"
          onClick={() => {
            leaveLobby();
            clearMatch();
            navigate("/play");
          }}
        >
          Leave match
        </Button>
      </div>
      <GameCanvas
        className="mx-auto aspect-[16/9] w-full max-w-5xl"
        multiplayer={bridge}
        mapId={(match.mapId as MapId) ?? "diner-1"}
      />
      <p className="mt-3 text-center text-sm text-[color:var(--color-muted)]">
        Same kitchen for everyone · cook, plate, and serve together online
      </p>
    </div>
  );
}
