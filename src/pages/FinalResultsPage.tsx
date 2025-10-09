import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FinalResults } from "@/components/game/FinalResults";
import { GameRoom } from "@/lib/gameState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function FinalResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!location.state?.gameRoom) {
      navigate('/');
    }
  }, [location.state, navigate]);

  // Update player statistics when game ends
  useEffect(() => {
    const updatePlayerStats = async () => {
      if (!user || !location.state?.gameRoom) return;

      const gameRoom = location.state.gameRoom as GameRoom;
      const sortedPlayers = [...gameRoom.players].sort((a, b) => b.score - a.score);
      
      // Find the current user's player
      const currentPlayer = gameRoom.players.find(p => p.id === user.id);
      if (!currentPlayer) return;

      const playerRank = sortedPlayers.findIndex(p => p.id === currentPlayer.id) + 1;
      const isWinner = playerRank === 1;
      const isSecondPlace = playerRank === 2;

      // Calculate players tricked and times tricked
      // This would need vote data from the game rounds to be accurate
      // For now, we'll just increment games_played and conditionally games_won/second_places

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (currentProfile) {
        const updates = {
          games_played: (currentProfile.games_played || 0) + 1,
          games_won: (currentProfile.games_won || 0) + (isWinner ? 1 : 0),
          second_places: (currentProfile.second_places || 0) + (isSecondPlace ? 1 : 0),
          total_points: (currentProfile.total_points || 0) + currentPlayer.score,
        };

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
      }
    };

    updatePlayerStats();
  }, [location.state, user]);

  if (!location.state?.gameRoom) {
    return null;
  }

  const gameRoom = location.state.gameRoom as GameRoom;

  const handlePlayAgain = () => {
    // Navigate back to main menu to create a new game
    navigate('/');
  };

  const handleReturnToMenu = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4 pb-20 flex items-center justify-center">
      <FinalResults 
        gameRoom={gameRoom}
        onPlayAgain={handlePlayAgain}
        onReturnToMenu={handleReturnToMenu}
      />
      
      {/* Room code footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border py-3 px-4">
        <p className="text-center text-sm text-muted-foreground">
          Room Code: <span className="font-mono font-bold text-foreground">{gameRoom.code}</span>
        </p>
      </div>
    </div>
  );
}
