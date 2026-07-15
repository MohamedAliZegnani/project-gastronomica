import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button, Card, Input } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.login({ email, password });
      setSession(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Welcome back</h1>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">Log in to your brigade.</p>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[color:var(--color-muted)]">
        New here? <Link className="text-[color:var(--color-accent)]" to="/register">Register</Link>
        {" · "}
        <Link className="text-[color:var(--color-accent)]" to="/guest">
          Guest
        </Link>
      </p>
    </Card>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.register({ displayName, email, password });
      setSession(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Join the kitchen</h1>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">Create your chef profile.</p>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <Input
          label="Display name"
          required
          maxLength={24}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="nickname"
        />
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Register"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[color:var(--color-muted)]">
        Already cooking? <Link className="text-[color:var(--color-accent)]" to="/login">Login</Link>
      </p>
    </Card>
  );
}

export function GuestPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.guest(displayName || undefined);
      setSession(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start guest session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Guest service</h1>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">
        Jump in without an account. Progress is temporary in Phase 2.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <Input
          label="Chef name (optional)"
          maxLength={24}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Entering…" : "Continue as guest"}
        </Button>
      </form>
    </Card>
  );
}
