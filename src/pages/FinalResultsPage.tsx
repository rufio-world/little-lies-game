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
