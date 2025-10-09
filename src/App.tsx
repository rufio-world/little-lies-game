import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import CreateGame from "./pages/CreateGame";
import JoinGame from "./pages/JoinGame";
import WaitingRoom from "./pages/WaitingRoom";
import GameRound from "./pages/GameRound";
import FinalResultsPage from "./pages/FinalResultsPage";
import Store from "./pages/Store";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/create-game" element={<CreateGame />} />
            <Route path="/join-game" element={<JoinGame />} />
            <Route path="/waiting-room/:gameCode" element={<WaitingRoom />} />
            <Route path="/game-round" element={<GameRound />} />
            <Route path="/final-results" element={<FinalResultsPage />} />
            <Route path="/store" element={<Store />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
