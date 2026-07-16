import { Link } from "react-router-dom";
import { APP_NAME } from "@gastronomica/shared";
import { ControlsLegend } from "../components/ControlsLegend";
import { StatusPill } from "../components/StatusPill";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui";

export function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <section className="relative min-h-[min(92vh,820px)] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 70% 40%, rgba(212,160,23,0.18), transparent 50%), radial-gradient(ellipse 60% 50% at 15% 80%, rgba(124,179,66,0.12), transparent 45%), linear-gradient(165deg, #15241c 0%, #0c1410 55%, #0a120e 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 47px, rgba(243,239,230,0.03) 48px), repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(243,239,230,0.03) 48px)",
          }}
        />
        <div className="relative mx-auto flex min-h-[min(92vh,820px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-24 md:justify-center md:pb-24">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--color-accent)] animate-[fadeUp_0.7s_ease_both]">
            Co-op cooking · live service
          </p>
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight md:text-7xl animate-[fadeUp_0.8s_ease_both]">
            {APP_NAME}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-[color:var(--color-muted)] animate-[fadeUp_0.9s_ease_both]">
            Plate under pressure with friends — wash, chop, cook, and serve before the rush ends.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[fadeUp_1s_ease_both]">
            <Link to="/">
              <Button className="!px-6 !py-3">Play now</Button>
            </Link>
            <Link to="/embed">
              <Button variant="secondary">DuoArcade embed</Button>
            </Link>
            {user && (
              <Link to="/dashboard">
                <Button variant="secondary">Dashboard</Button>
              </Link>
            )}
          </div>
          <div className="mt-10 animate-[fadeUp_1.1s_ease_both]">
            <StatusPill />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">How a service runs</h2>
        <p className="mt-2 max-w-2xl text-[color:var(--color-muted)]">
          Three minutes on the clock. Build combos, keep customers happy, and close with stars.
        </p>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Prep",
              body: "Grab pantry stock, wash produce, chop, and fire the grill or fryer.",
            },
            {
              step: "02",
              title: "Plate",
              body: "Assemble on the pass, serve the right order, and protect your combo.",
            },
            {
              step: "03",
              title: "Co-op",
              body: "Invite friends to a private room or queue for a quick match.",
            },
          ].map((item) => (
            <div key={item.step}>
              <p className="font-mono text-sm text-[color:var(--color-accent)]">{item.step}</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">{item.body}</p>
            </div>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Kitchen controls</h2>
        <p className="mt-2 mb-6 text-[color:var(--color-muted)]">
          Focus the game canvas, then cook. Press H in-match for the same legend.
        </p>
        <ControlsLegend />
      </section>
    </div>
  );
}
