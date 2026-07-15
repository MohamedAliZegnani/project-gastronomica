import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GameCanvas } from "../components/GameCanvas";
import { MapLobby } from "../components/MapLobby";
import { isMapId, type MapId } from "../game/maps/catalog";

/**
 * Full-bleed kitchen for DuoArcade iframe embeds.
 * Lobby first; optional ?map=diner-1 skips to a kitchen.
 */
export function EmbedPage() {
  const [params] = useSearchParams();
  const deepMap = params.get("map");
  const [mapId, setMapId] = useState<MapId | null>(() =>
    isMapId(deepMap) ? deepMap : null,
  );

  const title = useMemo(() => {
    const a = params.get("nameA") || params.get("name");
    const b = params.get("nameB");
    if (a && b) return `${a} & ${b}`;
    if (a) return a;
    return "Ready, Set, Cook";
  }, [params]);

  return (
    <div className="embed-shell">
      <header className="embed-bar">
        <div>
          <p className="embed-kicker">DuoArcade</p>
          <h1 className="embed-title">{title}</h1>
        </div>
        <div className="embed-bar-actions">
          {mapId && (
            <button type="button" className="embed-lobby-btn" onClick={() => setMapId(null)}>
              Lobby
            </button>
          )}
          <p className="embed-hint">WASD · E interact · Q drop · Space throw · H help</p>
        </div>
      </header>
      <div className="embed-stage">
        {!mapId ? (
          <div className="embed-lobby-wrap">
            <MapLobby compact onPlay={setMapId} />
          </div>
        ) : (
          <GameCanvas
            className="embed-canvas"
            mapId={mapId}
            onReturnToLobby={() => setMapId(null)}
          />
        )}
      </div>
    </div>
  );
}
