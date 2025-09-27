import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameRoom } from "@/lib/gameState";
import { Trophy, CheckCircle, XCircle, Users, Star, Target, Zap } from "lucide-react";

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

  // Find who tricked the current player (if they voted wrong)
  const whoTrickedYou = !votedCorrectly && playerVote 
    ? currentRound.answers.find(a => a.id === playerVote && !a.isCorrect) 
    : null;
  const trickerPlayer = whoTrickedYou 
    ? gameRoom.players.find(p => p.id === whoTrickedYou.playerId) 
    : null;

  // Find who the current player tricked (who voted for their fake answer)
  const playersYouTricked = playerAnswer 
    ? playerAnswer.votes.map(voterId => 
        gameRoom.players.find(p => p.id === voterId)
      ).filter(Boolean)
    : [];

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

            {/* Who Tricked You */}
            {trickerPlayer && (
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-900 dark:text-red-100">You Were Tricked By</h3>
                </div>
                <div className="flex items-center gap-3">
                  <img 
                    src={trickerPlayer.avatar} 
                    alt={trickerPlayer.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">{trickerPlayer.name}</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Their fake answer: "{whoTrickedYou?.answer}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Who You Tricked */}
            {playerAnswer && playersYouTricked.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">You Tricked</h3>
                  <Badge variant="default" className="bg-green-600">+{playersYouTricked.length} pts</Badge>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  Your fake answer: "{playerAnswer.answer}"
                </p>
                <div className="space-y-2">
                  {playersYouTricked.map(player => (
                    <div key={player?.id} className="flex items-center gap-3">
                      <img 
                        src={player?.avatar} 
                        alt={player?.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        {player?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary if no tricks happened */}
            {!trickerPlayer && playersYouTricked.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Round Summary</h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {votedCorrectly 
                    ? "You voted correctly and weren't tricked by anyone!"
                    : "You voted correctly but didn't trick any other players."}
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
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Current Scoreboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isCurrentPlayer = player.id === currentPlayer.id;
              const rank = index + 1;
              const rankIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
              
              return (
                <div 
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isCurrentPlayer 
                      ? 'bg-primary/10 border-primary/20 ring-2 ring-primary/10' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        rank === 1 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        rank === 2 ? 'bg-gray-100 dark:bg-gray-900/30' :
                        rank === 3 ? 'bg-orange-100 dark:bg-orange-900/30' :
                        'bg-muted'
                      }`}>
                        {rankIcon}
                      </div>
                      <img 
                        src={player.avatar} 
                        alt={player.name}
                        className="w-8 h-8 rounded-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{player.name}</span>
                        {isCurrentPlayer && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                        {player.isHost && (
                          <Badge variant="outline" className="text-xs">Host</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {gameRoom.currentQuestionIndex + 1} question{gameRoom.currentQuestionIndex + 1 !== 1 ? 's' : ''} played
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{player.score}</div>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              );
            })}
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