import { ENVIRONMENTS, MAPS, type MapId } from "../game/maps/catalog";
import type { DuoLobbyState, DuoRole } from "@gastronomica/shared";
import { useKitchenProgress } from "../stores/kitchenProgress";

function MapStars({ percent }: { percent: number }) {
  const fill = Math.max(0, Math.min(100, percent));
  return (
    <span className="map-slot-stars" title={`Best ${fill}%`} aria-label={`Best ${fill}%`}>
      <span className="map-slot-stars-track" aria-hidden>
        ★★★
      </span>
      <span className="map-slot-stars-fill" style={{ width: `${fill}%` }} aria-hidden>
        ★★★
      </span>
    </span>
  );
}

export function MapLobby({
  onPlay,
  compact = false,
  duo = null,
  myRole = null,
  myMapId = null,
  onPick,
  showCoins = true,
}: {
  onPlay?: (mapId: MapId) => void;
  compact?: boolean;
  /** Live duo lobby votes (DuoArcade embed). */
  duo?: DuoLobbyState | null;
  myRole?: DuoRole | null;
  myMapId?: MapId | null;
  /** Duo mode: select a map (does not start alone). */
  onPick?: (mapId: MapId) => void;
  showCoins?: boolean;
}) {
  const peerRole: DuoRole | null = myRole === "A" ? "B" : myRole === "B" ? "A" : null;
  const peer = peerRole && duo ? duo.players[peerRole] : null;
  const me = myRole && duo ? duo.players[myRole] : null;
  const peerMap = (peer?.mapId as MapId | null) ?? null;
  const duoMode = Boolean(duo && onPick);

  const localCoins = useKitchenProgress((s) => s.coins);
  const localBest = useKitchenProgress((s) => s.mapBest);
  const coins = duo ? (duo.coins ?? localCoins) : localCoins;

  function bestFor(mapId: MapId) {
    if (duo) return duo.mapBest?.[mapId] ?? null;
    return localBest[mapId] ?? null;
  }

  return (
    <div className={`map-lobby ${compact ? "compact" : ""}`}>
      {!compact && (
        <header className="map-lobby-head">
          <p className="embed-kicker">Pick a kitchen</p>
          <h2>Environments</h2>
          <p className="map-lobby-lead">
            {duoMode
              ? "Both of you must choose the same map, then press Ready."
              : "Four worlds · five maps each · start with Map 1, more unlock later."}
          </p>
        </header>
      )}

      {showCoins && (
        <div className="kitchen-coins-bar" title={duoMode ? "Shared duo coins" : "Your kitchen coins"}>
          <span className="kitchen-coins-icon" aria-hidden>
            🪙
          </span>
          <span className="kitchen-coins-label">{duoMode ? "Duo coins" : "Coins"}</span>
          <span className="kitchen-coins-value">{coins.toLocaleString()}</span>
        </div>
      )}

      {duoMode && (
        <div className="duo-vote-strip">
          <div className={`duo-vote-chip${me?.mapId ? " has-pick" : ""}`}>
            <span className="duo-vote-who">You</span>
            <span className="duo-vote-map">
              {me?.mapId ? MAPS[me.mapId as MapId]?.name ?? me.mapId : "No map yet"}
            </span>
          </div>
          <div className={`duo-vote-chip peer${peerMap ? " has-pick" : ""}`}>
            <span className="duo-vote-who">Partner</span>
            <span className="duo-vote-map">
              {peerMap ? MAPS[peerMap]?.name ?? peerMap : "Choosing…"}
            </span>
          </div>
        </div>
      )}

      <div className="map-lobby-grid">
        {ENVIRONMENTS.map((env) => (
          <section
            key={env.id}
            className={`map-env map-env-${env.id}`}
            style={{ ["--env-accent" as string]: env.accent }}
          >
            <div className="map-env-top">
              <div>
                <h3>{env.title}</h3>
                <p>{env.blurb}</p>
              </div>
              <span className={`map-diff map-diff-${env.difficulty.toLowerCase()}`}>
                {env.difficulty}
              </span>
            </div>

            <div className="map-slots">
              {env.slots.map((slotId, i) => {
                if (!slotId) {
                  return (
                    <div key={`${env.id}-locked-${i}`} className="map-slot locked" title="Coming soon">
                      <span className="map-slot-num">{i + 1}</span>
                      <span className="map-slot-label">Locked</span>
                    </div>
                  );
                }
                const map = MAPS[slotId];
                const mine = myMapId === slotId || me?.mapId === slotId;
                const theirs = peerMap === slotId;
                const both = mine && theirs;
                const best = bestFor(slotId);
                const classes = [
                  "map-slot",
                  "playable",
                  mine ? "picked-mine" : "",
                  theirs ? "picked-peer" : "",
                  both ? "picked-both" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={slotId}
                    type="button"
                    className={classes}
                    onClick={() => (duoMode ? onPick?.(slotId) : onPlay?.(slotId))}
                  >
                    <span className="map-slot-num">{map.slot}</span>
                    <span className="map-slot-name">{map.name}</span>
                    <span className="map-slot-cta">
                      {both
                        ? "Both ✓"
                        : mine
                          ? "Your pick"
                          : theirs
                            ? "Partner ✓"
                            : duoMode
                              ? "Choose"
                              : "Play"}
                    </span>
                    <span className="map-slot-stats">
                      <span className="map-slot-best">
                        {best ? `${best.percent}%` : "—"}
                      </span>
                      <MapStars percent={best?.percent ?? 0} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
