import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemePicker } from "./components/ThemePicker";
import { useGamePrefs } from "./stores/gamePrefs";
import { siteThemeById } from "./theme/siteThemes";
import "./index.css";

function PrefsBridge({ children }: { children: ReactNode }) {
  const reduceMotion = useGamePrefs((s) => s.reduceMotion);
  const siteTheme = useGamePrefs((s) => s.siteTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", siteTheme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", siteThemeById(siteTheme).swatches[0]);
  }, [siteTheme]);

  return (
    <>
      {children}
      <ThemePicker />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <PrefsBridge>
          <App />
        </PrefsBridge>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
