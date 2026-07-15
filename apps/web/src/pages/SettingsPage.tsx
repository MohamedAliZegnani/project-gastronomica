import { type FormEvent, useEffect, useState } from "react";
import type { UserSettings } from "@gastronomica/shared";
import { api, ApiError } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useGamePrefs } from "../stores/gamePrefs";
import { Button, Card, Input, PageHeader } from "../components/ui";
import { ChefCustomizePanel } from "../components/ChefCustomizePanel";

export function SettingsPage() {
  const token = useAuthStore((s) => s.token)!;
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const setFromSettings = useGamePrefs((s) => s.setFromSettings);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .settings(token)
      .then((r) => {
        setSettings(r.settings);
        setFromSettings({
          masterVolume: r.settings.masterVolume,
          musicVolume: r.settings.musicVolume,
          sfxVolume: r.settings.sfxVolume,
          reduceMotion: r.settings.reduceMotion,
          showPings: r.settings.showPings,
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [token, setFromSettings]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings || !user) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { settings: next } = await api.updateSettings(token, settings);
      setSettings(next);
      setFromSettings({
        masterVolume: next.masterVolume,
        musicVolume: next.musicVolume,
        sfxVolume: next.sfxVolume,
        reduceMotion: next.reduceMotion,
        showPings: next.showPings,
      });
      setSession(token, {
        ...user,
        displayName: next.displayName,
        bio: next.bio,
      });
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!settings && !error) {
    return <p className="text-[color:var(--color-muted)]">Loading settings…</p>;
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, chef look, and audio preferences." />
      {error && <p className="mb-3 text-red-300">{error}</p>}

      <div className="mb-6 max-w-3xl">
        <ChefCustomizePanel compact />
      </div>

      {settings && (
        <Card className="max-w-xl">
          <form className="grid gap-4" onSubmit={onSubmit}>
            <Input
              label="Display name"
              value={settings.displayName}
              maxLength={24}
              onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
            />
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-muted)]">
                Bio
              </span>
              <textarea
                className="min-h-24 rounded-xl border border-white/10 bg-[#0f1a14] px-3 py-2.5 outline-none focus:border-[color:var(--color-accent)]"
                maxLength={140}
                value={settings.bio}
                onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
              />
            </label>
            {(
              [
                ["masterVolume", "Master volume"],
                ["musicVolume", "Music"],
                ["sfxVolume", "SFX"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid gap-1.5 text-sm">
                <span className="flex justify-between text-xs font-bold uppercase tracking-wider text-[color:var(--color-muted)]">
                  <span>{label}</span>
                  <span>{settings[key]}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings[key]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ ...settings, [key]: value });
                    setFromSettings({ [key]: value });
                  }}
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(e) => {
                  const reduceMotion = e.target.checked;
                  setSettings({ ...settings, reduceMotion });
                  setFromSettings({ reduceMotion });
                }}
              />
              Reduce motion
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showPings}
                onChange={(e) => {
                  const showPings = e.target.checked;
                  setSettings({ ...settings, showPings });
                  setFromSettings({ showPings });
                }}
              />
              Show pings
            </label>
            {message && <p className="text-sm text-[color:var(--color-accent-2)]">{message}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
