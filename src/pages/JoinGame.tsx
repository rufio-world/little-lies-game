import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { storage } from "@/lib/storage";
import { GameService } from "@/services/gameService";
import { useToast } from "@/hooks/use-toast";
import { GameLogic } from "@/lib/gameState";

export default function JoinGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameCode, setGameCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const requiredLength = GameLogic.GAME_CODE_LENGTH;

  const joinErrorKeyFromMessage = (message?: string) => {
    if (!message) return 'generic';
    const normalized = message.toLowerCase();
    if (normalized.includes('game has already started')) return 'alreadyStarted';
    if (normalized.includes('game room not found')) return 'notFound';
    if (normalized.includes('leave your current game')) return 'alreadyInGame';
    if (normalized.includes('must be logged in')) return 'authRequired';
    return 'generic';
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      toast({
        title: t('common.error'),
        description: t('joinGame.enterCode'),
        variant: "destructive"
      });
      return;
    }

    if (gameCode.length !== requiredLength) {
      toast({
        title: t('common.error'),
        description: t('joinGame.lengthError', { length: requiredLength }),
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    
    try {
      const profile = await storage.getPlayerProfile();
      const { roomId, playerId } = await GameService.joinGame({
        gameCode: gameCode.toUpperCase(),
        player: {
          name: profile.name,
          avatar: profile.avatar,
          isGuest: profile.isGuest
        }
      });

      // Store player info for the waiting room
      storage.setCurrentPlayer({
        id: playerId,
        roomId,
        isHost: false
      });

      toast({
        title: t('joinGame.join'),
        description: t('joinGame.success')
      });
      
      // Navigate to waiting room
      navigate(`/waiting-room/${gameCode.toUpperCase()}`);
      
    } catch (error) {
      console.error('Error joining game:', error);
      const errorKey = joinErrorKeyFromMessage(error instanceof Error ? error.message : undefined);
      toast({
        title: t('joinGame.errors.title'),
        description: t(`joinGame.errors.${errorKey}`),
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= requiredLength) {
      setGameCode(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-3 md:p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">{t('joinGame.title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              {t('joinGame.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {/* Game Code Input */}
            <div className="space-y-2">
              <Label htmlFor="game-code">{t('joinGame.enterCode')}</Label>
              <Input
                id="game-code"
                value={gameCode}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                placeholder="ABCD1234"
                className="font-mono text-lg text-center tracking-widest"
                maxLength={requiredLength}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                {t('joinGame.lengthError', { length: requiredLength })}
              </p>
            </div>

            {/* Visual Code Display */}
            <div className="flex justify-center">
              <div className="flex gap-1">
                {Array.from({ length: requiredLength }).map((_, i) => (
                  <div 
                    key={i}
                    className={`w-8 h-10 sm:w-10 sm:h-12 border-2 rounded-md flex items-center justify-center font-mono text-base sm:text-lg font-bold ${
                      gameCode[i] 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-muted bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {gameCode[i] || ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Join Button */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                {t('joinGame.back')}
              </Button>
              <Button 
                onClick={handleJoinGame} 
                disabled={gameCode.length !== requiredLength || isJoining}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                {isJoining ? t('common.loading') : t('joinGame.join')}
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>{t('joinGame.instructions.askHost')}</p>
              <p>{t('joinGame.instructions.internet')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
