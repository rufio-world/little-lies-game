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
import { GameRoundService } from "@/services/gameRoundService";
import { GameService } from "@/services/gameService";
import popCultureEn from "@/data/popCulture.json";
import popCultureEs from "@/data/popCultureEs.json";

export default function GameRound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);

  useEffect(() => {
    if (!location.state?.gameRoom) {
      navigate('/');
      return;
    }

    const room = location.state.gameRoom as GameRoom;
    const player = location.state.currentPlayer;
    
    setGameRoom(room);
    setCurrentPlayer(player);

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

  // Auto-advance phases based on completion
  useEffect(() => {
    if (!currentRound || !gameRoom || !currentPlayer?.isHost) return;

    const advancePhase = async () => {
      try {
        if (currentRound.phase === 'answer-submission' && allAnswersSubmitted) {
          await GameRoundService.updateRoundPhase(currentRound.id, 'voting');
        } else if (currentRound.phase === 'voting' && allVotesSubmitted) {
          // Calculate scores and advance to results
          const scores = await GameRoundService.calculateRoundScores(currentRound.id);
          await GameRoundService.updatePlayerScores(gameRoom.id, scores);
          await GameRoundService.updateRoundPhase(currentRound.id, 'results');
        }
      } catch (error) {
        console.error('Error advancing phase:', error);
      }
    };

    advancePhase();
  }, [allAnswersSubmitted, allVotesSubmitted, currentRound, gameRoom, currentPlayer]);


  const getCurrentQuestion = () => {
    if (!allQuestions.length || !gameRoom || !currentRound) return null;
    return allQuestions.find(q => q.id === currentRound.question_id);
  };

  if (!gameRoom || !allQuestions.length || !currentPlayer || roundLoading) {
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
            onContinue={async () => {
              if (!currentPlayer.isHost) return;

              try {
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
              } catch (error) {
                console.error('Error creating new round:', error);
                toast({
                  title: "Error",
                  description: "Failed to create new round",
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
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      {renderGamePhase()}
    </div>
  );
}