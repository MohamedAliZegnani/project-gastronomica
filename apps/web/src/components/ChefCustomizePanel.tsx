import {
  APRON_SWATCHES,
  CHEF_LOOK_PRESETS,
  HAT_SWATCHES,
  SHIRT_SWATCHES,
  SHOE_SWATCHES,
  SKIN_SWATCHES,
  colorToCss,
  type ChefLook,
  type HatStyle,
} from "../game/cosmetics/chefLook";
import { useGamePrefs } from "../stores/gamePrefs";
import { ChefPreview, hatStyleLabel } from "./ChefPreview";

function SwatchRow({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: number[];
  value: number;
  onPick: (c: number) => void;
}) {
  return (
    <div className="chef-swatch-row">
      <span className="chef-swatch-label">{label}</span>
      <div className="chef-swatches">
        {colors.map((c) => {
          const selected = c === value;
          return (
            <button
              key={`${label}-${c}`}
              type="button"
              className={`chef-swatch${selected ? " selected" : ""}`}
              style={{ background: colorToCss(c) }}
              aria-label={`${label} ${colorToCss(c)}`}
              aria-pressed={selected}
              onClick={() => onPick(c)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ChefCustomizePanel({
  onDone,
  compact = false,
}: {
  onDone?: () => void;
  compact?: boolean;
}) {
  const look = useGamePrefs((s) => s.chefLook);
  const setChefLook = useGamePrefs((s) => s.setChefLook);

  function patch(partial: Partial<ChefLook>) {
    setChefLook(partial);
  }

  return (
    <div className={`chef-customize${compact ? " compact" : ""}`}>
      <header className="chef-customize-head">
        <p className="embed-kicker">Your chef</p>
        <h2>Clothes & colors</h2>
        <p className="chef-customize-lead">
          Same cook — swap the hat style and recolor hat, shirt, apron, skin, and shoes.
        </p>
      </header>

      <div className="chef-customize-body">
        <div className="chef-customize-preview">
          <ChefPreview look={look} size={compact ? 132 : 168} />
        </div>

        <div className="chef-customize-controls">
          <div className="chef-presets">
            {CHEF_LOOK_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chef-preset"
                onClick={() => patch(p.look)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="chef-hat-styles">
            <span className="chef-swatch-label">Hat style</span>
            <div className="chef-hat-style-btns">
              {(["floppy", "toque"] as HatStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`rsc-btn${look.hatStyle === style ? "" : " ghost"}`}
                  onClick={() => patch({ hatStyle: style })}
                >
                  {hatStyleLabel(style)}
                </button>
              ))}
            </div>
          </div>

          <SwatchRow
            label="Hat"
            colors={HAT_SWATCHES}
            value={look.hatColor}
            onPick={(hatColor) => patch({ hatColor })}
          />
          <SwatchRow
            label="Shirt"
            colors={SHIRT_SWATCHES}
            value={look.shirtColor}
            onPick={(shirtColor) => patch({ shirtColor })}
          />
          <SwatchRow
            label="Apron"
            colors={APRON_SWATCHES}
            value={look.apronColor}
            onPick={(apronColor) => patch({ apronColor })}
          />
          <SwatchRow
            label="Skin"
            colors={SKIN_SWATCHES}
            value={look.skinColor}
            onPick={(skinColor) => patch({ skinColor })}
          />
          <SwatchRow
            label="Shoes"
            colors={SHOE_SWATCHES}
            value={look.shoeColor}
            onPick={(shoeColor) => patch({ shoeColor })}
          />

          {onDone && (
            <button type="button" className="rsc-btn chef-done" onClick={onDone}>
              Done — back to maps
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
