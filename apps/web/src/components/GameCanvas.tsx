import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { createKitchenGame, type MatchSnapshot, type MultiplayerBridge } from "../game/createGame";
import type { MapId } from "../game/maps/catalog";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useGamePrefs } from "../stores/gamePrefs";
import { useKitchenProgress } from "../stores/kitchenProgress";

export function GameCanvas({
  className = "",
  multiplayer,
  mapId = "diner-1",
  onReturnToLobby,
  /** When true, coins are applied by the duo server — don't double-count locally. */
  duoSharedProgress = false,
}: {
  className?: string;
  multiplayer?: MultiplayerBridge;
  mapId?: MapId;
  onReturnToLobby?: () => void;
  duoSharedProgress?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const applyMatch = useKitchenProgress((s) => s.applyMatch);
  const lobbyRef = useRef(onReturnToLobby);
  lobbyRef.current = onReturnToLobby;
  const mpKey = multiplayer
    ? `${multiplayer.localId}:${multiplayer.peers.map((p) => p.id).join(",")}`
    : "solo";

  useEffect(() => {
    if (!hostRef.current) return;

    const onMatchComplete = (result: MatchSnapshot) => {
      if (!duoSharedProgress) {
        applyMatch({
          mapId,
          coinsEarned: result.coinsEarned,
          performancePercent: result.performancePercent,
          stars: result.stars,
        });
      }
      const authToken = useAuthStore.getState().token;
      if (!authToken) return;
      void api
        .completeMatch(authToken, {
          xpEarned: result.xpEarned,
          coinsEarned: result.coinsEarned,
          score: result.score,
          stars: result.stars,
          served: result.served,
        })
        .then(({ user }) => {
          setSession(authToken, user);
        })
        .catch(() => {
          /* ignore */
        });
    };

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const prefs = useGamePrefs.getState();
    const game = createKitchenGame({
      parent: hostRef.current,
      mapId,
      onMatchComplete,
      onReturnToLobby: () => lobbyRef.current?.(),
      multiplayer,
      audioPrefs: {
        masterVolume: prefs.masterVolume,
        sfxVolume: prefs.sfxVolume,
      },
      chefLook: prefs.chefLook,
    });
    gameRef.current = game;
    (window as unknown as { __RSC_GAME__?: Phaser.Game }).__RSC_GAME__ = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSession, mpKey, mapId, duoSharedProgress, applyMatch]);

  useEffect(() => {
    const unsub = useGamePrefs.subscribe((state) => {
      const g = gameRef.current;
      if (!g) return;
      g.registry.set("audioPrefs", {
        masterVolume: state.masterVolume,
        sfxVolume: state.sfxVolume,
      });
    });
    return unsub;
  }, []);

  return (
    <div
      ref={hostRef}
      className={`overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40 ${className}`}
      tabIndex={0}
      aria-label="Kitchen game canvas — click to focus for keyboard controls"
    />
  );
}
