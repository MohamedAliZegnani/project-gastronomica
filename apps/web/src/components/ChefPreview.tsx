import {
  colorToCss,
  type ChefLook,
  type HatStyle,
} from "../game/cosmetics/chefLook";

/** Lightweight SVG preview — same chibi silhouette as the game chef. */
export function ChefPreview({
  look,
  className = "",
  size = 160,
}: {
  look: ChefLook;
  className?: string;
  size?: number;
}) {
  const hat = colorToCss(look.hatColor);
  const shirt = colorToCss(look.shirtColor);
  const apron = colorToCss(look.apronColor);
  const skin = colorToCss(look.skinColor);
  const shoe = colorToCss(look.shoeColor);
  const ink = "#2b1d14";

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 72 88"
      role="img"
      aria-label="Chef preview"
    >
      <ellipse cx="36" cy="80" rx="18" ry="4" fill="#000" opacity="0.2" />
      {/* shoes */}
      <rect x="24" y="68" width="10" height="10" rx="2" fill={ink} />
      <rect x="38" y="68" width="10" height="10" rx="2" fill={ink} />
      <rect x="25" y="69" width="8" height="8" rx="1" fill={shoe} />
      <rect x="39" y="69" width="8" height="8" rx="1" fill={shoe} />
      {/* body */}
      <rect x="22" y="50" width="28" height="20" rx="8" fill={ink} />
      <rect x="24" y="52" width="24" height="16" rx="6" fill={shirt} />
      <rect x="28" y="54" width="16" height="12" rx="4" fill={apron} />
      {/* arms */}
      <circle cx="18" cy="58" r="7" fill={ink} />
      <circle cx="54" cy="58" r="7" fill={ink} />
      <circle cx="18" cy="58" r="5" fill={skin} />
      <circle cx="54" cy="58" r="5" fill={skin} />
      {/* head */}
      <circle cx="36" cy="36" r="16" fill={ink} />
      <circle cx="36" cy="36" r="13.5" fill={skin} />
      <ellipse cx="28" cy="40" rx="4" ry="2.5" fill="#ffab91" opacity="0.85" />
      <ellipse cx="44" cy="40" rx="4" ry="2.5" fill="#ffab91" opacity="0.85" />
      <circle cx="31" cy="34" r="2.2" fill={ink} />
      <circle cx="41" cy="34" r="2.2" fill={ink} />
      <circle cx="30.2" cy="33.2" r="0.8" fill="#fff" />
      <circle cx="40.2" cy="33.2" r="0.8" fill="#fff" />
      <ellipse cx="36" cy="42" rx="5" ry="2.5" fill="#e57373" />
      {look.hatStyle === "toque" ? (
        <Toque hat={hat} ink={ink} />
      ) : (
        <FloppyHat hat={hat} ink={ink} />
      )}
    </svg>
  );
}

function FloppyHat({ hat, ink }: { hat: string; ink: string }) {
  return (
    <g>
      <ellipse cx="36" cy="24" rx="22" ry="7" fill={ink} />
      <ellipse cx="36" cy="24" rx="18" ry="5" fill={hat} />
      <polygon points="36,4 22,28 50,28" fill={ink} />
      <polygon points="36,7 25,26 47,26" fill={hat} />
      <circle cx="44" cy="10" r="4" fill={ink} />
      <circle cx="44" cy="10" r="2.5" fill={hat} />
      <circle cx="28" cy="22" r="2.5" fill="#fff" opacity="0.35" />
    </g>
  );
}

function Toque({ hat, ink }: { hat: string; ink: string }) {
  return (
    <g>
      <ellipse cx="36" cy="24" rx="18" ry="6" fill={ink} />
      <ellipse cx="36" cy="24" rx="15" ry="4" fill={hat} />
      <rect x="26" y="6" width="20" height="20" rx="5" fill={ink} />
      <rect x="28" y="8" width="16" height="17" rx="4" fill={hat} />
      <ellipse cx="36" cy="8" rx="12" ry="8" fill={ink} />
      <ellipse cx="36" cy="8" rx="10" ry="6" fill={hat} />
      <circle cx="32" cy="5" r="2.5" fill="#fff" opacity="0.35" />
      <rect x="26" y="20" width="20" height="4" fill={ink} opacity="0.5" />
    </g>
  );
}

export function hatStyleLabel(style: HatStyle): string {
  return style === "toque" ? "Toque" : "Floppy";
}
