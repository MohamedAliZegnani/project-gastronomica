import { Link } from "react-router-dom";
import { ControlsLegend } from "../components/ControlsLegend";
import { GameCanvas } from "../components/GameCanvas";
import { Button, PageHeader } from "../components/ui";

export function PracticePage() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Practice kitchen"
          subtitle="3-minute service · combos · stars · XP & coins"
        />
        <Link to="/play">
          <Button variant="secondary">Back to play</Button>
        </Link>
      </div>
      <GameCanvas className="mx-auto aspect-[16/9] w-full max-w-5xl" />
      <p className="mt-3 text-center text-sm text-[color:var(--color-muted)]">
        Click the kitchen to focus · H help · Esc pause
      </p>
      <ControlsLegend className="mx-auto mt-4 max-w-5xl" />
    </div>
  );
}
