import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameRoom } from "@/lib/gameState";
import { Trophy, CheckCircle, XCircle, Users, Star } from "lucide-react";

interface ScoringResultsProps {
  gameRoom: GameRoom;
  currentPlayer: any;
  onContinue: () => void;
}

export function ScoringResults({ gameRoom, currentPlayer, onContinue }: ScoringResultsProps) {
  if (!gameRoom.currentRound) {
    return <div>Loading results...</div>;
  }

  const { currentRound } = gameRoom;
  const correctAnswer = currentRound.answers.find(a => a.isCorrect);
  const playerVote = currentRound.playerVotes[currentPlayer.id];
  const playerAnswer = currentRound.answers.find(a => a.playerId === currentPlayer.id);
  const votedCorrectly = playerVote === correctAnswer?.id;
  
  // Calculate points earned this round
  let pointsEarned = 0;
  if (votedCorrectly) pointsEarned += 1;
  if (playerAnswer) {
    pointsEarned += playerAnswer.votes.length;
  }

  // Sort players by total score
  const sortedPlayers = [...gameRoom.players].sort((a, b) => b.score - a.score);

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
            Question {gameRoom.currentQuestionIndex + 1} Results
          </div>
        </div>
      </div>

      {/* Your Results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center">Your Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              +{pointsEarned} Points
            </div>
            <p className="text-muted-foreground">Earned this round</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Voting Result */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                {votedCorrectly ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-semibold">
                  {votedCorrectly ? "Correct Answer!" : "Wrong Answer"}
                </h3>
                {votedCorrectly && <Badge variant="default">+1 pt</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Correct answer: <span className="font-medium">{correctAnswer?.answer}</span>
              </p>
              {!votedCorrectly && (
                <p className="text-sm text-muted-foreground">
                  You voted for: {currentRound.answers.find(a => a.id === playerVote)?.answer}
                </p>
              )}
            </div>

            {/* Fooling Others */}
            {playerAnswer && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold">Players Fooled</h3>
                  {playerAnswer.votes.length > 0 && (
                    <Badge variant="default">+{playerAnswer.votes.length} pts</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your answer: <span className="font-medium">{playerAnswer.answer}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {playerAnswer.votes.length === 0 
                    ? "No players were fooled by your answer"
                    : `${playerAnswer.votes.length} player(s) voted for your answer!`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Answers Revealed */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>All Answers Revealed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentRound.answers.map(answer => {
              const isCorrect = answer.isCorrect;
              const authorName = answer.playerId === 'system' 
                ? 'Official Answer' 
                : gameRoom.players.find(p => p.id === answer.playerId)?.name || 'Unknown';
              
              return (
                <div 
                  key={answer.id}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-950/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                        <span className="font-medium">{answer.answer}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isCorrect ? 'Correct Answer' : `by ${authorName}`}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {answer.votes.length} vote{answer.votes.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Standings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === currentPlayer.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium">{player.name}</span>
                  {player.id === currentPlayer.id && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold">{player.score} pts</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Card>
        <CardContent className="pt-6">
          <Button onClick={onContinue} className="w-full" size="lg">
            {gameRoom.currentQuestionIndex + 1 >= gameRoom.maxQuestions 
              ? "View Final Results" 
              : "Continue to Next Question"
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}