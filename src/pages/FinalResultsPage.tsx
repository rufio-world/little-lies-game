import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FinalResults } from "@/components/game/FinalResults";
import { GameRoom } from "@/lib/gameState";

export default function FinalResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.gameRoom) {
      navigate('/');
    }
  }, [location.state, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4 flex items-center justify-center">
      <FinalResults 
        gameRoom={gameRoom}
        onPlayAgain={handlePlayAgain}
        onReturnToMenu={handleReturnToMenu}
      />
    </div>
  );
}
