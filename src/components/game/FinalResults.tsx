import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameRoom } from "@/lib/gameState";
import { Trophy, Crown, Medal, Star, RotateCcw, Home } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import confetti from "canvas-confetti";

interface FinalResultsProps {
  gameRoom: GameRoom;
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
}

export function FinalResults({ gameRoom, onPlayAgain, onReturnToMenu }: FinalResultsProps) {
  // Sort players by final score
  const sortedPlayers = [...gameRoom.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Play victory music and confetti on mount
  useEffect(() => {
    // Play victory music
    const audio = new Audio('/victory-fanfare.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Audio play failed:', err));
    audioRef.current = audio;
    
    // Trigger confetti
    const duration = 3000;
    const end = Date.now() + duration;
    
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-orange-600" />;
      default:
        return <Star className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-600";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-4xl font-bold mb-2">Game Over!</h1>
        <p className="text-xl text-muted-foreground">Final Results</p>
      </div>

      {/* Winner Announcement */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 p-6 text-center">
          <Crown className="h-12 w-12 mx-auto text-white mb-3" />
          <h2 className="text-2xl font-bold text-white mb-2">🎉 Winner! 🎉</h2>
          <div className="flex flex-col items-center gap-3 mt-4">
            <PlayerAvatar avatar={winner.avatar} name={winner.name} size="lg" />
            <p className="text-xl text-white font-semibold">{winner.name}</p>
            <p className="text-white/90">with {winner.score} points</p>
          </div>
        </div>
      </Card>

      {/* Final Standings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center text-xl">Final Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const rank = index + 1;
              const isWinner = rank === 1;
              
              return (
                <div 
                  key={player.id}
                  className={`relative overflow-hidden rounded-lg border-2 ${
                    isWinner ? 'border-yellow-400' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div 
                    className={`absolute inset-0 opacity-10 ${getRankColor(rank)}`}
                  />
                  <div className="relative p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(rank)}
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{rank}
                        </span>
                      </div>
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">{player.name}</span>
                          {isWinner && <Badge className="bg-yellow-500">Winner</Badge>}
                          {player.isHost && <Badge variant="outline">Host</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {player.score} {player.score === 1 ? 'point' : 'points'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {player.score}
                      </div>
                      <p className="text-sm text-muted-foreground">points</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Game Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Game Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {gameRoom.rounds.length}
              </div>
              <p className="text-sm text-muted-foreground">Questions Played</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {gameRoom.players.length}
              </div>
              <p className="text-sm text-muted-foreground">Total Players</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.max(...gameRoom.players.map(p => p.score))}
              </div>
              <p className="text-sm text-muted-foreground">Highest Score</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.round(gameRoom.players.reduce((sum, p) => sum + p.score, 0) / gameRoom.players.length)}
              </div>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={onPlayAgain}
          className="w-full"
          size="lg"
          variant="default"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Play Again
        </Button>
        
        <Button 
          onClick={onReturnToMenu}
          className="w-full"
          size="lg"
          variant="outline"
        >
          <Home className="h-5 w-5 mr-2" />
          Return to Menu
        </Button>
      </div>
    </div>
  );
}
