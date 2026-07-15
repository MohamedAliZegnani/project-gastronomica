import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useGamePrefs } from "./stores/gamePrefs";
import "./index.css";

function PrefsBridge({ children }: { children: ReactNode }) {
  const reduceMotion = useGamePrefs((s) => s.reduceMotion);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);
  return children;
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
