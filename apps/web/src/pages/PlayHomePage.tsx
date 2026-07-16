import { useState } from "react";
import { Link } from "react-router-dom";
import { APP_VERSION } from "@gastronomica/shared";
import { ChefCustomizePanel } from "../components/ChefCustomizePanel";
import { ControlsLegend } from "../components/ControlsLegend";
import { GameCanvas } from "../components/GameCanvas";
import { MapLobby } from "../components/MapLobby";
import type { MapId } from "../game/maps/catalog";
import { useKitchenProgress } from "../stores/kitchenProgress";

/** Public play home — lobby first, then kitchen. No account wall. */
export function PlayHomePage() {
  const [mapId, setMapId] = useState<MapId | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const coins = useKitchenProgress((s) => s.coins);

  return (
    <div className="play-home">
      <div className="play-home-hero">
        <p className="embed-kicker">DuoArcade kitchen</p>
        <h1>Ready, Set, Cook</h1>
        <p className="play-home-lead">
          Chaotic co-op cooking — solo maps below, or play online with a friend (same shared kitchen).
        </p>
        <div className="play-home-actions">
          {!mapId && !customizing ? (
            <a className="rsc-btn" href="#lobby">
              Choose map
            </a>
          ) : (
            <button
              type="button"
              className="rsc-btn ghost"
              onClick={() => {
                setMapId(null);
                setCustomizing(false);
              }}
            >
              Back to lobby
            </button>
          )}
          {!mapId && (
            <button
              type="button"
              className={`rsc-btn${customizing ? "" : " ghost"}`}
              onClick={() => setCustomizing((v) => !v)}
            >
              {customizing ? "Hide outfit" : "Change outfit"}
            </button>
          )}
          <Link className="rsc-btn ghost" to="/embed">
            Embed view
          </Link>
          <span className="kitchen-coins-pill" title="Kitchen coins">
            🪙 {coins.toLocaleString()}
          </span>
        </div>
        <p className="play-home-meta">v{APP_VERSION} · DuoArcade names · no login</p>
      </div>

      <section id="lobby" className="play-home-game">
        {mapId ? (
          <>
            <GameCanvas
              className="play-home-canvas"
              mapId={mapId}
              onReturnToLobby={() => setMapId(null)}
            />
            <ControlsLegend className="play-home-controls" />
          </>
        ) : customizing ? (
          <ChefCustomizePanel onDone={() => setCustomizing(false)} />
        ) : (
          <MapLobby onPlay={setMapId} />
        )}
      </section>
    </div>
  );
}
