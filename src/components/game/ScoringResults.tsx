import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameRoom, Question } from "@/lib/gameState";
import { GameRound, PlayerAnswer, PlayerVote, RoundReadiness } from "@/services/gameRoundService";
import { Trophy, Users, CheckCircle, XCircle, Target, Zap, Star } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { t } = useTranslation();
  // Calculate current player's vote and results
  const currentPlayerVote = votes.find(v => v.player_id === currentPlayer.id);
  const currentPlayerAnswer = answers.find(a => a.player_id === currentPlayer.id);

  // Check if current player was tricked
  const trickedByAnswer = currentPlayerVote?.voted_for_answer_id ? 
    answers.find(a => a.id === currentPlayerVote.voted_for_answer_id) : null;

  const trickerPlayer = trickedByAnswer ? 
    gameRoom.players.find(p => p.id === trickedByAnswer.player_id) : null;

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
    } else if (currentPlayerVote && !currentPlayerVote.voted_for_correct && trickerPlayer) {
      // Mischievous laugh sound effect - playful bouncing tones
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const times = [0, 0.08, 0.16, 0.28, 0.36, 0.48];
      const frequencies = [440, 554.37, 440, 554.37, 659.25, 523.25]; // A4, C#5, A4, C#5, E5, C5
      
      times.forEach((time, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequencies[index];
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.08);
        
        oscillator.start(audioContext.currentTime + time);
        oscillator.stop(audioContext.currentTime + time + 0.08);
      });
    }
  }, [currentPlayerVote, trickerPlayer]);
  
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

  return (
    <div className="max-w-2xl mx-auto px-2">
      {/* Header */}
      <div className="text-center mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">{gameRoom.name}</h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            {gameRoom.players.length} {t('game.players').toLowerCase()}
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3 md:h-4 md:w-4" />
            {t('game.question')} {gameRoom.currentQuestionIndex + 1} {t('game.results')}
          </div>
        </div>
      </div>

      {/* You Were Tricked! */}
      {trickerPlayer && currentPlayerVote && !currentPlayerVote.voted_for_correct && (
        <Card className="mb-4 md:mb-6 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/30 animate-scale-in">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl md:text-2xl font-bold text-orange-700 dark:text-orange-400">
              🎭 {t('game.youWereTricked')}!
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-orange-500">
                <AvatarImage src={trickerPlayer.avatar} alt={trickerPlayer.name} />
                <AvatarFallback className="text-2xl">{trickerPlayer.name[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg md:text-xl font-bold text-orange-900 dark:text-orange-100">
                  {trickerPlayer.name}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {t('game.trickedYou')}
                </p>
              </div>
            </div>
            <div className="w-full pt-3 border-t border-orange-300 dark:border-orange-700">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200 text-center mb-2">
                {t('game.correctAnswerWas')}:
              </p>
              <p className="text-base md:text-lg font-semibold text-orange-900 dark:text-orange-100 text-center bg-white/50 dark:bg-black/20 rounded-lg p-3">
                {question.correct_answer}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Results */}
      <Card className="mb-4 md:mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Target className="h-4 w-4 md:h-5 md:w-5" />
            {t('game.yourResults')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border">
            <span className="font-medium">{t('game.pointsEarned')}</span>
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
                  {currentPlayerVote?.voted_for_correct ? t('game.correctVote') : t('game.incorrectVote')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentPlayerVote?.voted_for_correct 
                    ? t('game.correctlyIdentified')
                    : trickerPlayer 
                      ? `${t('game.youWereTricked')} ${trickerPlayer.name}${t('game.fakeAnswer')}`
                      : t('game.didNotVoteCorrect')
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
                    {t('game.youTricked')}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {playersVotedForMe.length} {t('game.fooledPlayers')}{playersVotedForMe.length > 1 ? 's' : ''}: {" "}
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
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">{t('game.roundSummary')}</h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('game.noOneFooled')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Answers Revealed */}
      <Card className="mb-4 md:mb-6">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">{t('game.allAnswersRevealed')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 md:space-y-3">
            {/* Show correct answer first */}
            {/* SECURITY: Only show correct answer during results phase */}
            {round?.phase === 'results' && (
            <div className="p-3 md:p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-green-900 dark:text-green-100 text-xs md:text-sm">{t('game.correctAnswer')}</span>
                  </div>
                  <p className="text-green-800 dark:text-green-200 text-xs md:text-base break-words">{round?.correct_answer || '[Hidden]'}</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-xs flex-shrink-0">
                  {votes.filter(v => v.voted_for_correct).length} {t('game.votes')}
                </Badge>
              </div>
            </div>
            )}

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
                        <span className="font-medium">{author?.name}{t('game.answer')}</span>
                        {answer.player_id === currentPlayer.id && (
                          <Badge variant="outline" className="text-xs">{t('game.you')}</Badge>
                        )}
                      </div>
                      <p className="text-foreground">{answer.answer_text}</p>
                    </div>
                    <Badge variant="secondary">
                      {answerVotes.length} {t('game.votes').toLowerCase()}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Standings */}
      <Card className="mb-4 md:mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Trophy className="h-4 w-4 md:h-5 md:w-5" />
            {t('game.currentScoreboard')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 md:space-y-3">
            {[...gameRoom.players].sort((a, b) => b.score - a.score).map((player, index) => {
              const isCurrentPlayer = player.id === currentPlayer.id;
              const rank = index + 1;
              const rankIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
              
              return (
                <div 
                  key={player.id}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-lg border ${
                    isCurrentPlayer 
                      ? 'bg-primary/10 border-primary/20 ring-2 ring-primary/10' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-base md:text-lg font-bold flex-shrink-0 ${
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
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <span className="font-semibold text-sm md:text-base truncate">{player.name}</span>
                        {isCurrentPlayer && (
                          <Badge variant="secondary" className="text-xs">{t('game.you')}</Badge>
                        )}
                        {player.isHost && (
                          <Badge variant="outline" className="text-xs">{t('game.host')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('game.question')} {gameRoom.currentQuestionIndex + 1} {t('common.of')} {gameRoom.maxQuestions}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg md:text-xl font-bold text-primary">{player.score}</div>
                    <p className="text-xs text-muted-foreground">{t('game.points')}</p>
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
          <CardTitle>{t('game.playerReadiness')}</CardTitle>
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
                      <Badge variant="secondary" className="text-xs">{t('game.you')}</Badge>
                    )}
                  </div>
                  <div>
                    {isReady ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('game.ready')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {t('game.waiting')}
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
                {t('game.waitingOthers')}
              </>
            ) : (
              t('game.readyNextRound')
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}