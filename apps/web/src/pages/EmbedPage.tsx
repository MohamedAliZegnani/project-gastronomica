import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SocketEvents,
  type DuoLobbyState,
  type DuoRole,
  type MatchEndPayload,
  type MatchStartPayload,
} from "@gastronomica/shared";
import { GameCanvas } from "../components/GameCanvas";
import { MapLobby } from "../components/MapLobby";
import { isMapId, MAPS, type MapId } from "../game/maps/catalog";
import type { MultiplayerBridge } from "../game/net/MultiplayerBridge";
import { useLobbyStore } from "../stores/lobbyStore";
import { useKitchenProgress } from "../stores/kitchenProgress";

/**
 * Full-bleed kitchen for DuoArcade iframe embeds.
 *
 * Names come from DuoArcade query params (no login / name form here).
 * Duo (?duo=CODE&role=A|B): both pick the same map, ready up, then shared kitchen.
 */
export function EmbedPage() {
  const [params] = useSearchParams();
  const duoCode = (params.get("duo") || params.get("code") || "").trim().toUpperCase();
  const roleParam = params.get("role");
  const myRole: DuoRole = roleParam === "B" ? "B" : "A";
  // DuoArcade already has player names — use them silently (no UI to enter them)
  const nameA = params.get("nameA") || params.get("name") || "Chef A";
  const nameB = params.get("nameB") || "Chef B";
  const myName = myRole === "A" ? nameA : nameB;

  const deepMap = params.get("map");
  const [soloMapId, setSoloMapId] = useState<MapId | null>(() =>
    isMapId(deepMap) ? deepMap : null,
  );

  const connect = useLobbyStore((s) => s.connect);
  const socket = useLobbyStore((s) => s.socket);
  const match = useLobbyStore((s) => s.match);
  const sendKitchenInput = useLobbyStore((s) => s.sendKitchenInput);
  const clearMatch = useLobbyStore((s) => s.clearMatch);

  const [duo, setDuo] = useState<DuoLobbyState | null>(null);
  const [duoError, setDuoError] = useState<string | null>(null);
  const [playingMap, setPlayingMap] = useState<MapId | null>(null);
  const syncFromDuo = useKitchenProgress((s) => s.syncFromDuo);
  const localCoins = useKitchenProgress((s) => s.coins);

  const duoMode = Boolean(duoCode);

  // Join duo lobby room
  useEffect(() => {
    if (!duoMode) return;
    const s = connect();
    setDuoError(null);
    clearMatch();
    setPlayingMap(null);

    const onState = (state: DuoLobbyState) => {
      setDuo(state);
      syncFromDuo({
        coins: state.coins ?? 0,
        mapBest: state.mapBest ?? {},
      });
    };
    const onErr = (p: { message: string }) => setDuoError(p.message);
    const onStart = (m: MatchStartPayload) => {
      if (isMapId(m.mapId)) setPlayingMap(m.mapId);
    };
    const onEnd = (end: MatchEndPayload) => {
      if (end.coinsTotal != null || end.mapBest) {
        syncFromDuo({
          coins: end.coinsTotal ?? useKitchenProgress.getState().coins,
          mapBest: end.mapBest ?? useKitchenProgress.getState().mapBest,
        });
      }
    };

    s.on(SocketEvents.DUO_STATE, onState);
    s.on(SocketEvents.DUO_ERROR, onErr);
    s.on(SocketEvents.MATCH_START, onStart);
    s.on(SocketEvents.MATCH_END, onEnd);

    const join = () => {
      s.emit(SocketEvents.DUO_JOIN, {
        code: duoCode,
        role: myRole,
        displayName: myName,
        avatarHue: myRole === "A" ? 140 : 200,
      });
    };
    if (s.connected) join();
    else s.once("connect", join);

    return () => {
      s.emit(SocketEvents.DUO_LEAVE);
      s.off(SocketEvents.DUO_STATE, onState);
      s.off(SocketEvents.DUO_ERROR, onErr);
      s.off(SocketEvents.MATCH_START, onStart);
      s.off(SocketEvents.MATCH_END, onEnd);
    };
  }, [duoMode, duoCode, myRole, myName, connect, clearMatch, syncFromDuo]);

  const me = duo?.players[myRole] ?? null;
  const peerRole: DuoRole = myRole === "A" ? "B" : "A";
  const peer = duo?.players[peerRole] ?? null;
  const myMapId = (me?.mapId as MapId | null) ?? null;
  const peerMapId = (peer?.mapId as MapId | null) ?? null;
  const sameMap = Boolean(myMapId && peerMapId && myMapId === peerMapId);
  const waitingForPeer =
    Boolean(myMapId) && (!peerMapId || peerMapId !== myMapId);

  function pickMap(mapId: MapId) {
    socket?.emit(SocketEvents.DUO_PICK, { mapId });
  }

  function setReady(ready: boolean) {
    socket?.emit(SocketEvents.DUO_READY, { ready });
  }

  function backToDuoLobby() {
    clearMatch();
    setPlayingMap(null);
    socket?.emit(SocketEvents.DUO_JOIN, {
      code: duoCode,
      role: myRole,
      displayName: myName,
      avatarHue: myRole === "A" ? 140 : 200,
    });
  }

  const bridge: MultiplayerBridge | undefined =
    duoMode && match && socket?.id
      ? {
          localId: socket.id,
          peers: match.players,
          getPeers: () => useLobbyStore.getState().match?.players ?? match.players,
          sendState: () => {},
          getRemotes: () => useLobbyStore.getState().remotePlayers,
          authority: match.authority ?? true,
          mapId: match.mapId,
          sendInput: sendKitchenInput,
          getSnapshot: () => useLobbyStore.getState().snapshot,
        }
      : undefined;

  const inMatch = duoMode && playingMap && match;

  return (
    <div className="embed-shell">
      <header className="embed-bar">
        <div>
          <p className="embed-kicker">DuoArcade</p>
          <h1 className="embed-title">Ready, Set, Cook</h1>
        </div>
        <div className="embed-bar-actions">
          {(soloMapId || inMatch) && (
            <button
              type="button"
              className="embed-lobby-btn"
              onClick={() => {
                if (duoMode) backToDuoLobby();
                else setSoloMapId(null);
              }}
            >
              Lobby
            </button>
          )}
          <span className="kitchen-coins-pill" title={duoMode ? "Shared duo coins" : "Coins"}>
            🪙 {(duo?.coins ?? localCoins).toLocaleString()}
          </span>
          <p className="embed-hint">WASD · E interact · Q drop · Space throw · H help</p>
        </div>
      </header>

      <div className="embed-stage">
        {duoMode ? (
          inMatch && bridge ? (
            <GameCanvas
              className="embed-canvas"
              mapId={playingMap}
              multiplayer={bridge}
              duoSharedProgress
              onReturnToLobby={backToDuoLobby}
            />
          ) : (
            <div className="embed-lobby-wrap duo-embed-lobby">
              <MapLobby
                compact
                duo={duo}
                myRole={myRole}
                myMapId={myMapId}
                onPick={pickMap}
              />

              <div className="duo-ready-bar">
                {duoError && <p className="duo-ready-error">{duoError}</p>}

                {duo?.phase === "starting" && (
                  <p className="duo-ready-status">
                    Starting in {duo.countdown ?? "…"}…
                  </p>
                )}

                {waitingForPeer && duo?.phase === "lobby" && (
                  <p className="duo-ready-status">
                    Waiting for the other player to choose the same map
                    {myMapId ? ` (${MAPS[myMapId]?.name ?? myMapId})` : ""}…
                  </p>
                )}

                {!myMapId && duo?.phase === "lobby" && (
                  <p className="duo-ready-status muted">Choose a map above</p>
                )}

                {sameMap && duo?.phase === "lobby" && (
                  <p className="duo-ready-status ok">
                    Same map locked: {MAPS[myMapId!]?.name} — both press Ready
                  </p>
                )}

                <div className="duo-ready-actions">
                  <button
                    type="button"
                    className={`rsc-btn${me?.ready ? "" : " ghost"}`}
                    disabled={!sameMap || duo?.phase === "starting"}
                    onClick={() => setReady(!me?.ready)}
                  >
                    {me?.ready ? "Ready ✓" : "Ready"}
                  </button>
                  <span className="duo-peer-ready">
                    Partner: {peer?.ready ? "Ready ✓" : peer?.connected ? "Not ready" : "Connecting…"}
                  </span>
                </div>
              </div>
            </div>
          )
        ) : !soloMapId ? (
          <div className="embed-lobby-wrap">
            <MapLobby compact onPlay={setSoloMapId} />
          </div>
        ) : (
          <GameCanvas
            className="embed-canvas"
            mapId={soloMapId}
            onReturnToLobby={() => setSoloMapId(null)}
          />
        )}
      </div>
    </div>
  );
}
