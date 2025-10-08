import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameRoom, Question } from "@/lib/gameState";
import { GameRound, PlayerAnswer, PlayerVote, RoundReadiness } from "@/services/gameRoundService";
import { Trophy, Users, CheckCircle, XCircle, Target, Zap, Star } from "lucide-react";
import { useEffect } from "react";

interface ScoringResultsProps {
  question: Question;
  gameRoom: GameRoom;
  currentPlayer: any;
  round: GameRound;
  answers: PlayerAnswer[];
  votes: PlayerVote[];
  readiness: RoundReadiness[];
  isCurrentPlayerReady: boolean;
  onMarkReady: () => void;
}

export function ScoringResults({ 
  question, 
  gameRoom, 
  currentPlayer, 
  round, 
  answers, 
  votes,
  readiness,
  isCurrentPlayerReady,
  onMarkReady
}: ScoringResultsProps) {
  // Calculate current player's vote and results
  const currentPlayerVote = votes.find(v => v.player_id === currentPlayer.id);
  const currentPlayerAnswer = answers.find(a => a.player_id === currentPlayer.id);

  // Play sound based on voting result
  useEffect(() => {
    if (currentPlayerVote?.voted_for_correct) {
      // Positive sound - rising tones
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (currentPlayerVote && !currentPlayerVote.voted_for_correct) {
      // Negative sound - descending tones
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
      oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime + 0.15); // E4
      oscillator.frequency.setValueAtTime(261.63, audioContext.currentTime + 0.3); // C4
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    }
  }, [currentPlayerVote]);
  
  // Calculate scores for this round
  const roundScores: Record<string, number> = {};
  
  // Initialize scores
  gameRoom.players.forEach(player => {
    roundScores[player.id] = 0;
  });

  // Award points for correct votes
  votes.forEach(vote => {
    if (vote.voted_for_correct) {
      roundScores[vote.player_id] = (roundScores[vote.player_id] || 0) + 1;
    }
  });

  // Award points for tricking other players
  votes.forEach(vote => {
    if (vote.voted_for_answer_id) {
      const answer = answers.find(a => a.id === vote.voted_for_answer_id);
      if (answer) {
        roundScores[answer.player_id] = (roundScores[answer.player_id] || 0) + 1;
      }
    }
  });

  // Find who voted for current player's answer
  const playersVotedForMe = votes.filter(v => 
    v.voted_for_answer_id && 
    answers.find(a => a.id === v.voted_for_answer_id)?.player_id === currentPlayer.id
  );

  // Check if current player was tricked
  const trickedByAnswer = currentPlayerVote?.voted_for_answer_id ? 
    answers.find(a => a.id === currentPlayerVote.voted_for_answer_id) : null;

  const trickerPlayer = trickedByAnswer ? 
    gameRoom.players.find(p => p.id === trickedByAnswer.player_id) : null;

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
            Round {round.round_number} Results
          </div>
        </div>
      </div>

      {/* Your Results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Results This Round
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border">
            <span className="font-medium">Points Earned:</span>
            <Badge variant="default" className="text-lg px-3 py-1">
              +{roundScores[currentPlayer.id] || 0}
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Voting result */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              {currentPlayerVote?.voted_for_correct ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {currentPlayerVote?.voted_for_correct ? "Correct Vote! ✓" : "Incorrect Vote"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentPlayerVote?.voted_for_correct 
                    ? "You correctly identified the real answer!" 
                    : trickerPlayer 
                      ? `You were tricked by ${trickerPlayer.name}'s fake answer`
                      : "You didn't vote for the correct answer"
                  }
                </p>
              </div>
            </div>

            {/* Tricking results */}
            {playersVotedForMe.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Great Deception! 🎭
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You tricked {playersVotedForMe.length} player{playersVotedForMe.length > 1 ? 's' : ''}: {" "}
                    {playersVotedForMe.map(vote => 
                      gameRoom.players.find(p => p.id === vote.player_id)?.name
                    ).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {playersVotedForMe.length === 0 && currentPlayerAnswer && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Round Summary</h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  No one was fooled by your answer this round, but you can still earn points by voting correctly!
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
            {/* Show correct answer first */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">Correct Answer</span>
                  </div>
                  <p className="text-green-800 dark:text-green-200">{round.correct_answer}</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900">
                  {votes.filter(v => v.voted_for_correct).length} votes
                </Badge>
              </div>
            </div>

            {/* Show player answers */}
            {answers.map(answer => {
              const answerVotes = votes.filter(v => v.voted_for_answer_id === answer.id);
              const author = gameRoom.players.find(p => p.id === answer.player_id);
              
              return (
                <div key={answer.id} className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="font-medium">{author?.name}'s Answer</span>
                        {answer.player_id === currentPlayer.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-foreground">{answer.answer_text}</p>
                    </div>
                    <Badge variant="secondary">
                      {answerVotes.length} vote{answerVotes.length !== 1 ? 's' : ''}
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
            {[...gameRoom.players].sort((a, b) => b.score - a.score).map((player, index) => {
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
                        Round {round.round_number} of {gameRoom.maxQuestions}
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

      {/* Player Readiness Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Player Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {gameRoom.players.map(player => {
              const playerReadiness = readiness.find(r => r.player_id === player.id);
              const isReady = playerReadiness?.is_ready || false;
              
              return (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <img 
                      src={player.avatar} 
                      alt={player.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium">{player.name}</span>
                    {player.id === currentPlayer.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  <div>
                    {isReady ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Waiting...
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <Button 
            onClick={onMarkReady} 
            className="w-full" 
            size="lg"
            disabled={isCurrentPlayerReady}
          >
            {isCurrentPlayerReady ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Waiting for the other players
              </>
            ) : (
              "I'm Ready for Next Round"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}