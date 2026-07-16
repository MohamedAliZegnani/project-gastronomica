import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout, PublicLayout } from "./layouts/Layouts";
import { PlayHomePage } from "./pages/PlayHomePage";
import { EmbedPage } from "./pages/EmbedPage";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlayPage } from "./pages/PlayPage";
import { PracticePage } from "./pages/PracticePage";
import {
  LobbyRoomPage,
  MultiplayerMatchPage,
  PrivateMatchPage,
  QuickMatchPage,
} from "./pages/MultiplayerPages";
import { FriendsPage } from "./pages/FriendsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { ShopPage } from "./pages/ShopPage";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { EngineSandboxPage } from "./pages/EngineSandboxPage";
import { useAuthStore } from "./stores/authStore";

export function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      {/* DuoArcade embed + public play — no login / name entry */}
      <Route path="/" element={<PlayHomePage />} />
      <Route path="/embed" element={<EmbedPage />} />
      <Route path="/engine" element={<EngineSandboxPage />} />

      <Route element={<PublicLayout />}>
        <Route path="/about" element={<LandingPage />} />
      </Route>

      {/* Auth pages removed — DuoArcade already has accounts + names */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/guest" element={<Navigate to="/" replace />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/play/practice" element={<PracticePage />} />
        <Route path="/play/quick" element={<QuickMatchPage />} />
        <Route path="/play/private" element={<PrivateMatchPage />} />
        <Route path="/play/lobby/:code" element={<LobbyRoomPage />} />
        <Route path="/play/match/:code" element={<MultiplayerMatchPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/leaderboards" element={<LeaderboardsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
