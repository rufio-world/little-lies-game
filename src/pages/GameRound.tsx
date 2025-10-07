import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { GameRoom, GameState, QuestionPack, Question, GameLogic } from "@/lib/gameState";
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

export default function GameRound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [gameCode, setGameCode] = useState<string>('');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);

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
    setCurrentPlayer(playerInRoom);

    // Load question pack based on selected language
    const questionPacks: QuestionPack[] = [];
    if (room.selectedPacks.includes('pop_culture')) {
      if (room.language === 'es') {
        questionPacks.push(popCultureEs as QuestionPack);
      } else {
        questionPacks.push(popCultureEn as QuestionPack);
      }
    }

    // Set all questions for the game
    const questions = questionPacks.flatMap(pack => pack.questions);
    setAllQuestions(GameLogic.shuffleArray(questions));
  }, [location.state, navigate]);

  // Use live game room from hook, which includes real-time player score updates
  const gameRoom = liveGameRoom;

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

  // Auto-advance phases based on completion
  useEffect(() => {
    if (!currentRound || !gameRoom || !currentPlayer?.isHost) return;

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
            // Calculate scores and advance to results
            const scores = await GameRoundService.calculateRoundScores(currentRound.id);
            console.log('💯 Calculated scores:', scores);
            await GameRoundService.updatePlayerScores(gameRoom.id, scores);
            console.log('💾 Scores updated in database');
            await GameRoundService.updateRoundPhase(currentRound.id, 'results');
          }
        } else if (currentRound.phase === 'results') {
          // Check if all players are ready
          const allReady = await GameRoundService.checkAllPlayersReady(currentRound.id, gameRoom.id);
          setAllPlayersReady(allReady);
          
          if (allReady) {
            console.log('✅ All players ready, advancing to next round');
            const nextQuestionIndex = gameRoom.currentQuestionIndex + 1;
            
            if (nextQuestionIndex >= gameRoom.maxQuestions || nextQuestionIndex >= allQuestions.length) {
              // Game finished - navigate to final results
              navigate('/final-results', { 
                state: { gameRoom, currentPlayer } 
              });
            } else {
              // Update the question index in the database first
              const updatedIndex = await GameService.advanceToNextQuestion(gameRoom.id, currentPlayer.id);
              
              // Then start next round with the updated index
              const nextQuestion = allQuestions[nextQuestionIndex];
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
      }
    };

    advancePhase();
  }, [allAnswersSubmitted, allVotesSubmitted, currentRound, gameRoom, currentPlayer, readiness, allQuestions, navigate, toast]);


  const getCurrentQuestion = () => {
    if (!allQuestions.length || !gameRoom || !currentRound) return null;
    return allQuestions.find(q => q.id === currentRound.question_id);
  };

  if (!gameRoom || !allQuestions.length || !currentPlayer || roundLoading || roomLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Waiting for round to start...</p>
          <p className="text-muted-foreground">The host will start the next round.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4 pb-20">
      {renderGamePhase()}
      
      {/* Room code footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border py-3 px-4">
        <p className="text-center text-sm text-muted-foreground">
          Room Code: <span className="font-mono font-bold text-foreground">{gameCode}</span>
        </p>
      </div>
    </div>
  );
}