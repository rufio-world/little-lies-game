import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { storage } from "@/lib/storage";
import { Player, GameLogic, Question } from "@/lib/gameState";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameService } from "@/services/gameService";
import { Copy, Crown, Users, Play, AlertTriangle, X } from "lucide-react";
import { getQuestionPacks } from "@/lib/questionPacks";

export default function WaitingRoom() {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { gameRoom, loading, error } = useGameRoom(gameCode || '');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [soloWarningShown, setSoloWarningShown] = useState(false);

  useEffect(() => {
    const currentPlayerData = storage.getCurrentPlayer();
    if (!currentPlayerData) {
      // If no current player data, redirect to home
      navigate('/');
      return;
    }

    // Find current player in the game room
    if (gameRoom) {
      const player = gameRoom.players.find(p => p.id === currentPlayerData.id);
      if (player) {
        setCurrentPlayer(player);
      }
    }
  }, [gameRoom, navigate]);

  // Listen for game state changes and redirect when game starts
  useEffect(() => {
    console.log('🎮 WaitingRoom - Game state:', gameRoom?.gameState, 'Current player:', currentPlayer?.name);
    
    if (gameRoom && gameRoom.gameState !== 'waiting' && currentPlayer) {
      console.log('🚀 Game started! Redirecting...');
      toast({
        title: "Game started!",
        description: "Redirecting to game..."
      });
      
      setTimeout(() => {
        navigate('/game-round', { 
          state: { 
            gameRoom,
            currentPlayer: currentPlayer
          } 
        });
      }, 500);
    }
  }, [gameRoom?.gameState, currentPlayer, navigate, toast]);

  const copyGameCode = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      toast({
        title: "Copied!",
        description: `Game code ${gameCode} copied to clipboard`
      });
    }
  };

  const handleStartGame = async () => {
    if (!gameRoom || !currentPlayer) return;

    if (gameRoom.players.length === 1 && !soloWarningShown) {
      // Show warning for solo play first time
      toast({
        title: t('waitingRoom.soloWarning'),
        description: "Click Start Game again to confirm solo play",
        duration: 3000
      });
      setSoloWarningShown(true);
      return;
    }

    try {
      console.log('🎮 Host starting game...');
      const questionPacks = getQuestionPacks(gameRoom.selectedPacks, gameRoom.language);
      
      const allQuestions: Question[] = questionPacks.flatMap((pack) => pack.questions);
      const shuffledQuestions = GameLogic.shuffleArray(allQuestions).slice(0, gameRoom.maxQuestions);
      const firstQuestion = shuffledQuestions[0];
      
      if (!firstQuestion) {
        throw new Error('No questions available');
      }
      
      // Extract and store question IDs in the database for consistent game flow
      const questionIds = shuffledQuestions.map((q: any) => q.id);
      
      // Start the game and store the question sequence
      await GameService.startGame(gameRoom.id, currentPlayer.id, questionIds, firstQuestion);
      
      console.log('✅ Game started and first round created');
      
      toast({
        title: "Starting game...",
        description: "Loading first question..."
      });
      
      // Host navigates immediately
      setTimeout(() => {
        navigate('/game-round', { 
          state: { 
            gameRoom: { 
              ...gameRoom, 
              gameState: 'question-display',
              questionIds
            },
            currentPlayer: currentPlayer
          } 
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive"
      });
    }
  };

  const handleLeaveGame = async () => {
    if (currentPlayer) {
      try {
        await GameService.leaveGame(currentPlayer.id);
      } catch (error) {
        console.error('Error leaving game:', error);
      } finally {
        storage.clearCurrentPlayer();
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const kickPlayer = async (playerId: string) => {
    if (!gameRoom || !currentPlayer || !currentPlayer.isHost) return;
    
    try {
      await GameService.kickPlayer(playerId, currentPlayer.id);
      toast({
        title: "Player kicked",
        description: "Player has been removed from the game"
      });
    } catch (error) {
      console.error('Error kicking player:', error);
      toast({
        title: "Error",
        description: "Failed to kick player",
        variant: "destructive"
      });
    }
  };

  if (loading || !gameRoom || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {error ? error : 'Loading game room...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-3 md:p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2">{t('waitingRoom.title')}</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-base md:text-lg px-3 md:px-4 py-1.5 md:py-2 font-mono">
              {gameRoom.code}
            </Badge>
            <Button variant="ghost" size="icon" onClick={copyGameCode}>
              <Copy className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        {/* Game Info */}
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{gameRoom.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Question Packs:</span>
              <span className="font-medium">{gameRoom.selectedPacks.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Questions:</span>
              <span className="font-medium">
                {gameRoom.maxQuestions === -1 ? '∞' : gameRoom.maxQuestions}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Players */}
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              {t('waitingRoom.players')} ({gameRoom.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {gameRoom.players.map(player => (
                <div 
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <PlayerAvatar 
                    name={player.name}
                    avatar={player.avatar}
                    isHost={player.isHost}
                    isGuest={player.isGuest}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.name}</span>
                      {player.isHost && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {player.isGuest && (
                        <Badge variant="outline" className="text-xs">
                          Guest
                        </Badge>
                      )}
                    </div>
                  </div>
                  {currentPlayer.isHost && !player.isHost && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => kickPlayer(player.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Solo Play Warning */}
        {gameRoom.players.length === 1 && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('waitingRoom.waitingForPlayers')}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleLeaveGame}
            className="flex-1"
          >
            {t('waitingRoom.leaveGame')}
          </Button>
          
          {currentPlayer.isHost && (
            <Button 
              onClick={handleStartGame}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {t('waitingRoom.startGame')}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-xs md:text-sm text-muted-foreground mt-4 md:mt-6 space-y-1 px-2">
          <p>Share the game code with friends to join</p>
          {currentPlayer.isHost && <p>As the host, you can start the game anytime</p>}
        </div>
      </div>
    </div>
  );
}
