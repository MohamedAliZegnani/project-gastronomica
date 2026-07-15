import { Link } from "react-router-dom";
import { ControlsLegend } from "../components/ControlsLegend";
import { GameCanvas } from "../components/GameCanvas";
import { Button, PageHeader } from "../components/ui";

export function EngineSandboxPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Engine sandbox"
          subtitle="Full kitchen loop — no account required."
        />
        <Link to="/play/practice">
          <Button variant="secondary">Open in Play</Button>
        </Link>
      </div>
      <GameCanvas className="aspect-[16/9] w-full" />
      <p className="mt-3 text-center text-sm text-[color:var(--color-muted)]">
        Click to focus · H help · Esc pause · R replay on results
      </p>
      <ControlsLegend className="mt-4" />
    </div>
  );
}
