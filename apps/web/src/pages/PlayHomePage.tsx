import { useState } from "react";
import { Link } from "react-router-dom";
import { APP_VERSION } from "@gastronomica/shared";
import { ChefCustomizePanel } from "../components/ChefCustomizePanel";
import { ControlsLegend } from "../components/ControlsLegend";
import { GameCanvas } from "../components/GameCanvas";
import { MapLobby } from "../components/MapLobby";
import type { MapId } from "../game/maps/catalog";

/** Public play home — lobby first, then kitchen. No account wall. */
export function PlayHomePage() {
  const [mapId, setMapId] = useState<MapId | null>(null);
  const [customizing, setCustomizing] = useState(false);

  return (
    <div className="play-home">
      <div className="play-home-hero">
        <p className="embed-kicker">DuoArcade kitchen</p>
        <h1>Ready, Set, Cook</h1>
        <p className="play-home-lead">
          Chaotic co-op cooking — pick a world, then wash, chop, grill, plate, and serve.
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
        </div>
        <p className="play-home-meta">v{APP_VERSION} · no login required</p>
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
