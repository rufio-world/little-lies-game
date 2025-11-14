import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { GameRoom, GameState, QuestionPack, Question, GameLogic, Player } from "@/lib/gameState";
import { QuestionDisplay } from "@/components/game/QuestionDisplay";
import { AnswerSubmission } from "@/components/game/AnswerSubmission";
import { VotingPhase } from "@/components/game/VotingPhase";
import { ScoringResults } from "@/components/game/ScoringResults";
import { FinalResults } from "@/components/game/FinalResults";
import { useGameRound } from "@/hooks/useGameRound";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameRoundService } from "@/services/gameRoundService";
import { GameService } from "@/services/gameService";
import { supabase } from "@/integrations/supabase/client";
import popCultureEn from "@/data/popCulture.json";
import popCultureEs from "@/data/popCultureEs.json";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { storage } from "@/lib/storage";
import { PLAYER_INACTIVITY_LIMIT_MS } from "@/lib/constants";

export default function GameRound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [gameCode, setGameCode] = useState<string>('');
  const [initialGameRoom, setInitialGameRoom] = useState<GameRoom | null>(null);
  const [questionMap, setQuestionMap] = useState<Map<string, Question>>(new Map());
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // Get real-time game room updates including player scores
  const { gameRoom: liveGameRoom, loading: roomLoading } = useGameRoom(gameCode);

  useEffect(() => {
    if (!location.state?.gameRoom) {
      navigate('/');
      return;
    }

    const room = location.state.gameRoom as GameRoom;
    const player = location.state.currentPlayer;
    
    // Validate that the player belongs to this room
    const playerInRoom = room.players.find(p => p.id === player.id);
    
    if (!playerInRoom) {
      console.error('Player not found in room!', { playerId: player.id, roomId: room.id });
      toast({
        title: "Error",
        description: "You are not part of this game room",
        variant: "destructive"
      });
      navigate('/');
      return;
    }
    
    setGameCode(room.code);
    setInitialGameRoom(room);
    setCurrentPlayer(playerInRoom);

    // Load question pack based on selected language to create a question map
    const questionPacks: QuestionPack[] = [];
    if (room.selectedPacks.includes('pop_culture')) {
      if (room.language === 'es') {
        questionPacks.push(popCultureEs as QuestionPack);
      } else {
        questionPacks.push(popCultureEn as QuestionPack);
      }
    }

    // Create a map of question ID -> question for quick lookup
    const questions = questionPacks.flatMap(pack => pack.questions);
    const qMap = new Map<string, Question>();
    questions.forEach(q => qMap.set(q.id, q));
    setQuestionMap(qMap);
  }, [location.state, navigate]);

  // Use live game room from hook, which includes real-time player score updates
  const gameRoom = liveGameRoom ?? initialGameRoom;

  const {
    currentRound,
    answers,
    votes,
    loading: roundLoading,
    hasSubmittedAnswer,
    hasVoted,
    allAnswersSubmitted,
    allVotesSubmitted
  } = useGameRound(gameRoom?.id || '', currentPlayer?.id || '');

  const [readiness, setReadiness] = useState<any[]>([]);
  const [isCurrentPlayerReady, setIsCurrentPlayerReady] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leavingGame, setLeavingGame] = useState(false);
  const [autoStartError, setAutoStartError] = useState<string | null>(null);
  const autoStartAttempted = useRef(false);

  // Heartbeat to keep the player marked as active while they are in the round screen
  useEffect(() => {
    if (!currentPlayer?.id) return;

    let isCancelled = false;

    const touch = async () => {
      try {
        await supabase
          .from('players')
          .update({ last_active_at: new Date().toISOString(), connected: true })
          .eq('id', currentPlayer.id);
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to update player activity heartbeat:', error);
        }
      }
    };

    touch();
    const interval = setInterval(touch, PLAYER_INACTIVITY_LIMIT_MS / 2);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [currentPlayer?.id]);

  // Subscribe to readiness updates
  useEffect(() => {
    if (!currentRound?.id) return;

    const fetchReadiness = async () => {
      try {
        const data = await GameRoundService.getRoundReadiness(currentRound.id);
        setReadiness(data);
        setIsCurrentPlayerReady(data.some(r => r.player_id === currentPlayer?.id && r.is_ready));
      } catch (error) {
        console.error('Error fetching readiness:', error);
        setReadiness([]);
      }
    };

    fetchReadiness();

    const channel = supabase
      .channel(`round_readiness:${currentRound.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_readiness',
          filter: `round_id=eq.${currentRound.id}`
        },
        () => {
          fetchReadiness();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRound?.id, currentPlayer?.id]);

  // Auto-advance phases based on completion (HOST ONLY)
  useEffect(() => {
    if (!currentRound || !gameRoom || !currentPlayer?.isHost) return;
    
    // Validate game room state
    if (!gameRoom.id) {
      console.error('Game room ID missing');
      return;
    }

    const advancePhase = async () => {
      try {
        // Double-check completion by querying the actual database state
        // to prevent race conditions with stale flags
        if (currentRound.phase === 'answer-submission') {
          const actuallyComplete = await GameRoundService.checkAllAnswersSubmitted(currentRound.id, gameRoom.id);
          if (actuallyComplete && allAnswersSubmitted) {
            console.log('✅ All answers submitted, advancing to voting');
            await GameRoundService.updateRoundPhase(currentRound.id, 'voting');
          }
        } else if (currentRound.phase === 'voting') {
          const actuallyComplete = await GameRoundService.checkAllVotesSubmitted(currentRound.id, gameRoom.id);
          if (actuallyComplete && allVotesSubmitted) {
            console.log('✅ All votes submitted, advancing to results');
            await GameRoundService.updateRoundPhase(currentRound.id, 'results');
            const scores = await GameRoundService.calculateRoundScores(currentRound.id);
            console.log('💯 Calculated scores:', scores);
            await GameRoundService.updatePlayerScores(gameRoom.id, scores);
            console.log('💾 Scores updated in database');
          }
        } else if (currentRound.phase === 'results') {
          // Check if all players are ready
          const allReady = await GameRoundService.checkAllPlayersReady(currentRound.id, gameRoom.id);
          setAllPlayersReady(allReady);
          
          if (allReady) {
            console.log('✅ All players ready, advancing to next round');
            const nextQuestionIndex = gameRoom.currentQuestionIndex + 1;
            
            if (nextQuestionIndex > gameRoom.maxQuestions) {
              // Game finished - navigate to final results
              // Note: currentQuestionIndex is 0-indexed, maxQuestions is 1-indexed
              // So if maxQuestions = 5, valid indices are 0-4, and nextIndex > 5 means we've completed all 5
              navigate('/final-results', { 
                state: { gameRoom, currentPlayer } 
              });
            } else {
              // Validate question sequence exists
              if (!gameRoom.questionIds || gameRoom.questionIds.length === 0) {
                console.error('Question sequence missing');
                throw new Error('Game question sequence is corrupted');
              }

              // Update the question index in the database first
              const updatedIndex = await GameService.advanceToNextQuestion(gameRoom.id, currentPlayer.id);
              
              // Get the next question ID from the stored sequence
              const nextQuestionId = gameRoom.questionIds?.[nextQuestionIndex];
              if (!nextQuestionId) {
                console.error('No question ID found at index', nextQuestionIndex, 'sequence length:', gameRoom.questionIds.length);
                throw new Error('Question sequence error: index out of bounds');
              }
              
              const nextQuestion = questionMap.get(nextQuestionId);
              if (!nextQuestion) {
                console.error('Question not found in map:', nextQuestionId);
                throw new Error('Question not found in loaded data');
              }
              
              await GameRoundService.createRound(
                gameRoom.id,
                updatedIndex + 1,
                nextQuestion
              );
              
              toast({
                title: "New round started!",
                description: "Get ready for the next question."
              });
            }
          }
        }
      } catch (error) {
        console.error('Error advancing phase:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to advance phase",
          variant: "destructive"
        });
      }
    };

    advancePhase();
  }, [allAnswersSubmitted, allVotesSubmitted, currentRound, gameRoom, currentPlayer, readiness, questionMap, navigate, toast]);

  // Navigate all players to final results when game ends (ALL PLAYERS)
  useEffect(() => {
    if (!currentRound || !gameRoom || !currentPlayer || !questionMap.size) return;

    const checkGameEnd = async () => {
      if (currentRound.phase === 'results') {
        const allReady = await GameRoundService.checkAllPlayersReady(currentRound.id, gameRoom.id);
        
        if (allReady) {
          const nextQuestionIndex = gameRoom.currentQuestionIndex + 1;
          
          if (nextQuestionIndex > gameRoom.maxQuestions) {
            // Game finished - navigate to final results
            // Note: currentQuestionIndex is 0-indexed, maxQuestions is 1-indexed
            navigate('/final-results', { 
              state: { gameRoom, currentPlayer } 
            });
          }
        }
      }
    };

    checkGameEnd();
  }, [currentRound, gameRoom, currentPlayer, questionMap, navigate]);


  const getCurrentQuestion = () => {
    if (!questionMap.size || !gameRoom || !currentRound) return null;
    return questionMap.get(currentRound.question_id);
  };

  const handleLeaveGame = async () => {
    if (!currentPlayer) return;
    setLeavingGame(true);
    try {
      await GameService.leaveGame(currentPlayer.id);
      storage.clearCurrentPlayer();
      toast({
        title: t('game.leaveGame'),
        description: t('common.ok')
      });
      navigate('/');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.retry'),
        variant: "destructive"
      });
    } finally {
      setLeavingGame(false);
      setLeaveDialogOpen(false);
    }
  };

  const isRoomLoading = roomLoading && !initialGameRoom;

  if (!gameRoom || !questionMap.size || !currentPlayer || roundLoading || isRoomLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  const startInitialRound = useCallback(async () => {
    if (!gameRoom?.questionIds?.length || !questionMap.size) {
      throw new Error('No questions available');
    }

    const totalQuestions = gameRoom.questionIds.length;
    const questionIndex = Math.min(
      gameRoom.currentQuestionIndex ?? 0,
      Math.max(totalQuestions - 1, 0)
    );
    const targetQuestionId = gameRoom.questionIds[questionIndex];
    if (!targetQuestionId) {
      throw new Error('No questions available');
    }

    const targetQuestion = questionMap.get(targetQuestionId);
    if (!targetQuestion) {
      throw new Error('Question not found');
    }

    const roundNumber = (gameRoom.currentQuestionIndex ?? 0) + 1;
    await GameRoundService.createRound(gameRoom.id, roundNumber, targetQuestion);
  }, [gameRoom, questionMap]);

  const handleStartRound = useCallback(async () => {
    if (!currentPlayer?.isHost || isStartingRound) return;

    setIsStartingRound(true);
    setAutoStartError(null);
    try {
      await startInitialRound();
      toast({
        title: "Round started!",
        description: "Get ready to play!"
      });
    } catch (error) {
      console.error('Error starting round:', error);
      const message = error instanceof Error ? error.message : "Failed to start round";
      setAutoStartError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsStartingRound(false);
    }
  }, [currentPlayer?.isHost, isStartingRound, startInitialRound]);

  useEffect(() => {
    if (!currentPlayer?.isHost) return;
    if (currentRound) return;
    if (!gameRoom?.questionIds?.length) return;
    if (!questionMap.size) return;
    if (autoStartAttempted.current) return;

    autoStartAttempted.current = true;
    setIsStartingRound(true);
    setAutoStartError(null);

    startInitialRound()
      .then(() => {
        setAutoStartError(null);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to start round";
        console.error('Auto-start round failed:', error);
        setAutoStartError(message);
        autoStartAttempted.current = false;
      })
      .finally(() => {
        setIsStartingRound(false);
      });
  }, [currentPlayer?.isHost, currentRound, gameRoom?.questionIds, questionMap, startInitialRound]);

  useEffect(() => {
    if (currentRound) {
      setAutoStartError(null);
    }
  }, [currentRound]);

  useEffect(() => {
    autoStartAttempted.current = false;
  }, [gameRoom?.id]);

  if (!currentRound) {
    const isHost = currentPlayer?.isHost;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="flex justify-center mb-4">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p className="text-lg font-medium mb-2">
            {isHost ? "Preparing the first round..." : "Waiting for the host..."}
          </p>
          <p className="text-muted-foreground">
            {isHost
              ? "Hang tight while we load the first question."
              : "The host is getting the first round ready."}
          </p>
          {isHost && autoStartError && (
            <>
              <p className="text-sm text-destructive mt-4">{autoStartError}</p>
              <Button 
                onClick={handleStartRound} 
                disabled={isStartingRound}
                className="mt-4"
              >
                {isStartingRound ? "Retrying..." : "Retry starting round"}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Question not found!</p>
          <p className="text-muted-foreground">There was an error loading the question.</p>
        </div>
      </div>
    );
  }

  // Render appropriate component based on round phase
  const renderGamePhase = () => {
    if (!currentRound) return <div>Loading...</div>;

    switch (currentRound.phase) {
      case 'answer-submission':
        return (
          <AnswerSubmission
            question={currentQuestion}
            gameRoom={gameRoom}
            currentPlayer={currentPlayer}
            round={currentRound}
            hasSubmitted={hasSubmittedAnswer}
            allSubmitted={allAnswersSubmitted}
            onSubmitAnswer={async (answer) => {
              try {
                await GameRoundService.submitAnswer(currentRound.id, currentPlayer.id, answer);
                toast({
                  title: "Answer submitted!",
                  description: "Waiting for other players..."
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to submit answer",
                  variant: "destructive"
                });
              }
            }}
          />
        );
      
      case 'voting':
        return (
          <VotingPhase
            question={currentQuestion}
            gameRoom={gameRoom}
            currentPlayer={currentPlayer}
            round={currentRound}
            answers={answers}
            hasVoted={hasVoted}
            allVoted={allVotesSubmitted}
            onVote={async (answerId, isCorrect) => {
              try {
                await GameRoundService.submitVote(
                  currentRound.id, 
                  currentPlayer.id, 
                  isCorrect ? undefined : answerId,
                  isCorrect
                );
                toast({
                  title: "Vote submitted!",
                  description: "Waiting for other players..."
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to submit vote",
                  variant: "destructive"
                });
              }
            }}
          />
        );
      
      case 'results':
        return (
          <ScoringResults
            question={currentQuestion}
            gameRoom={gameRoom}
            currentPlayer={currentPlayer}
            round={currentRound}
            answers={answers}
            votes={votes}
            readiness={readiness}
            isCurrentPlayerReady={isCurrentPlayerReady}
            onMarkReady={async () => {
              try {
                await GameRoundService.markPlayerReady(currentRound.id, currentPlayer.id);
                toast({
                  title: "Ready!",
                  description: "Waiting for other players..."
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to mark as ready",
                  variant: "destructive"
                });
              }
            }}
          />
        );
      
      default:
        return <div>Loading game phase...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-2 md:p-4 pb-16 md:pb-20">
      <div className="flex justify-end mb-3 md:mb-4">
        <AlertDialog open={leaveDialogOpen} onOpenChange={(open) => !leavingGame && setLeaveDialogOpen(open)}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              {t('game.leaveGame')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('game.leaveGame')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('game.leaveGameConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={leavingGame}>
                {t('common.no')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveGame} disabled={leavingGame}>
                {leavingGame ? t('common.loading') : t('common.yes')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {renderGamePhase()}
      
      {/* Room code footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border py-2 md:py-3 px-3 md:px-4">
        <p className="text-center text-xs md:text-sm text-muted-foreground">
          Room Code: <span className="font-mono font-bold text-foreground">{gameCode}</span>
        </p>
      </div>
    </div>
  );
}
