import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GameRoom } from "@/lib/gameState";
import { Clock, Users, Trophy, Vote } from "lucide-react";

interface VotingPhaseProps {
  gameRoom: GameRoom;
  currentPlayer: any;
  onVote: (answerId: string) => void;
}

export function VotingPhase({ gameRoom, currentPlayer, onVote }: VotingPhaseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(45); // 45 seconds to vote
  const [voted, setVoted] = useState(false);
  
  useEffect(() => {
    if (timeLeft > 0 && !voted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !voted) {
      // Auto vote for first option if time runs out
      const firstAnswer = gameRoom.currentRound?.answers[0];
      if (firstAnswer) {
        handleVote(firstAnswer.id);
      }
    }
  }, [timeLeft, voted, gameRoom.currentRound?.answers]);

  const handleVote = (answerId: string) => {
    if (voted) return;
    
    setVoted(true);
    onVote(answerId);
  };

  const progress = ((45 - timeLeft) / 45) * 100;
  
  if (!gameRoom.currentRound) {
    return <div>Loading voting phase...</div>;
  }

  // Filter out the current player's answer so they can't vote for themselves
  const votableAnswers = gameRoom.currentRound.answers.filter(
    answer => answer.playerId !== currentPlayer.id
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">{gameRoom.name}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {gameRoom.players.length} players
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            Question {gameRoom.currentQuestionIndex + 1} of {gameRoom.maxQuestions}
          </div>
        </div>
      </div>

      {/* Timer */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Time to Vote</span>
                <Badge variant={timeLeft <= 10 ? "destructive" : "secondary"}>
                  {timeLeft}s
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!voted ? (
        <>
          {/* Question */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">
                <Vote className="h-5 w-5 inline-block mr-2" />
                Which is the correct answer?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-primary mb-2">
                  {gameRoom.currentRound.question}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose the answer you think is correct. You'll earn points for guessing right!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Answer Options */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-3">
                {votableAnswers.map((answer, index) => (
                  <Button
                    key={answer.id}
                    variant={selectedAnswer === answer.id ? "default" : "outline"}
                    className="w-full text-left h-auto p-4"
                    onClick={() => setSelectedAnswer(answer.id)}
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1 text-base">{answer.answer}</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={() => handleVote(selectedAnswer)}
                disabled={!selectedAnswer}
                className="w-full mt-4"
                size="lg"
              >
                Submit Vote
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  Vote Submitted! ✓
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  Waiting for other players to vote...
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">You voted for:</p>
                <p className="font-medium">
                  {votableAnswers.find(a => a.id === selectedAnswer)?.answer}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voting Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {gameRoom.players.map(player => (
              <div 
                key={player.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="font-medium">{player.name}</span>
                  {player.id === currentPlayer.id && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                <Badge variant={voted && player.id === currentPlayer.id ? "default" : "secondary"}>
                  {voted && player.id === currentPlayer.id ? "Voted" : "Voting..."}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}