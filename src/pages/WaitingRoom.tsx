import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { storage } from "@/lib/storage";
import { GameRoom, Player, createMockGameRoom } from "@/lib/gameState";
import { Copy, Crown, Users, Play, AlertTriangle, X } from "lucide-react";

export default function WaitingRoom() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [soloWarningShown, setSoloWarningShown] = useState(false);

  useEffect(() => {
    // Get current player from storage
    const profile = storage.getPlayerProfile();
    
    // Create or get game room (mock for now)
    const mockRoom = createMockGameRoom();
    mockRoom.code = gameCode || 'TEST1';
    
    // Set game data from location state if available
    if (location.state) {
      const { gameName, selectedPacks, maxQuestions, isHost: hostFlag } = location.state;
      if (gameName) mockRoom.name = gameName;
      if (selectedPacks) mockRoom.selectedPacks = selectedPacks;
      if (maxQuestions) mockRoom.maxQuestions = maxQuestions;
      setIsHost(hostFlag || false);
    }

    // Add current player to room
    const player: Player = {
      id: `player-${Date.now()}`,
      name: profile.name,
      avatar: profile.avatar,
      score: 0,
      isHost: location.state?.isHost || false,
      isGuest: profile.isGuest
    };

    mockRoom.players = [player];
    mockRoom.hostId = player.id;

    setCurrentPlayer(player);
    setGameRoom(mockRoom);
  }, [gameCode, location.state]);

  const copyGameCode = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      toast({
        title: "Copied!",
        description: `Game code ${gameCode} copied to clipboard`
      });
    }
  };

  const handleStartGame = () => {
    if (!gameRoom) return;

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

    // Start the game (solo or multiplayer)
    toast({
      title: "Starting game...",
      description: "Redirecting to game..."
    });
    
    // Navigate to game (placeholder)
    setTimeout(() => {
      navigate('/game-round', { state: { gameRoom } });
    }, 1500);
  };

  const handleLeaveGame = () => {
    navigate('/');
  };

  const kickPlayer = (playerId: string) => {
    if (!gameRoom || !isHost) return;
    
    // TODO: Implement kick functionality
    toast({
      title: "Player kicked",
      description: "Player has been removed from the game"
    });
  };

  if (!gameRoom || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">{t('waitingRoom.title')}</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-lg px-4 py-2 font-mono">
              {gameRoom.code}
            </Badge>
            <Button variant="ghost" size="icon" onClick={copyGameCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Game Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{gameRoom.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('waitingRoom.players')} ({gameRoom.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                  {isHost && !player.isHost && (
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
          
          {isHost && (
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
        <div className="text-center text-sm text-muted-foreground mt-6 space-y-1">
          <p>Share the game code with friends to join</p>
          {isHost && <p>As the host, you can start the game anytime</p>}
        </div>
      </div>
    </div>
  );
}