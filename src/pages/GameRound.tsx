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

    // Load question packs based on selected packs
    const questionPacks: QuestionPack[] = [];
    if (room.selectedPacks.includes('pop_culture')) {
      questionPacks.push(popCultureEn as QuestionPack);
      questionPacks.push(popCultureEs as QuestionPack);
    }

    // Set all questions for the game
    const questions = questionPacks.flatMap(pack => pack.questions);
    setAllQuestions(GameLogic.shuffleArray(questions));

    // Initialize game with first question if not already started
    if (room.gameState === 'waiting') {
      const updatedRoom = {
        ...room,
        gameState: 'question-display' as GameState
      };
      setGameRoom(updatedRoom);
    }
  }, [location.state, navigate]);

  const updateGameRoom = (updates: Partial<GameRoom>) => {
    if (!gameRoom) return;
    const updatedRoom = { ...gameRoom, ...updates };
    setGameRoom(updatedRoom);
  };

  const getCurrentQuestion = () => {
    if (!allQuestions.length || !gameRoom) return null;
    return allQuestions[gameRoom.currentQuestionIndex];
  };

  if (!gameRoom || !allQuestions.length || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No more questions!</p>
          <p className="text-muted-foreground">The game has ended.</p>
        </div>
      </div>
    );
  }

  // Render appropriate component based on game state
  const renderGamePhase = () => {
    switch (gameRoom.gameState) {
      case 'question-display':
        return (
          <QuestionDisplay
            question={currentQuestion}
            gameRoom={gameRoom}
            onContinue={() => updateGameRoom({ gameState: 'answer-submission' })}
          />
        );
      
      case 'answer-submission':
        return (
          <AnswerSubmission
            question={currentQuestion}
            gameRoom={gameRoom}
            currentPlayer={currentPlayer}
            onSubmitAnswer={(answer) => {
              // For now, just move to voting phase
              // In real implementation, this would sync with Supabase
              const updatedRoom = {
                ...gameRoom,
                gameState: 'voting' as GameState,
                currentRound: {
                  questionId: currentQuestion.id,
                  question: currentQuestion.question,
                  correctAnswer: currentQuestion.correct_answer,
                  answers: GameLogic.createGameAnswers(
                    { [currentPlayer.id]: answer },
                    currentQuestion.correct_answer,
                    currentQuestion.question
                  ),
                  playerAnswers: { [currentPlayer.id]: answer },
                  playerVotes: {}
                }
              };
              setGameRoom(updatedRoom);
            }}
          />
        );
      
      case 'voting':
        return (
          <VotingPhase
            gameRoom={gameRoom}
            currentPlayer={currentPlayer}
            onVote={(answerId) => {
              if (!gameRoom.currentRound) return;
              
              const updatedRound = {
                ...gameRoom.currentRound,
                playerVotes: { ...gameRoom.currentRound.playerVotes, [currentPlayer.id]: answerId }
              };
              
              // Calculate scores and move to results
              const scores = GameLogic.calculateScores(updatedRound, gameRoom.players);
              const updatedPlayers = gameRoom.players.map(player => ({
                ...player,
                score: player.score + (scores[player.id] || 0)
              }));
              
              const updatedRoom = {
                ...gameRoom,
                gameState: 'results' as GameState,
                currentRound: updatedRound,
                players: updatedPlayers,
                rounds: [...gameRoom.rounds, updatedRound]
              };
              setGameRoom(updatedRoom);
            }}
          />
        );
      
      case 'results':
        return (
          <ScoringResults
            gameRoom={gameRoom}
            currentPlayer={currentPlayer}
            onContinue={() => {
              const nextQuestionIndex = gameRoom.currentQuestionIndex + 1;
              
              if (nextQuestionIndex >= gameRoom.maxQuestions || nextQuestionIndex >= allQuestions.length) {
                // Game finished
                updateGameRoom({ gameState: 'game-end' });
              } else {
                // Next question
                updateGameRoom({
                  gameState: 'question-display',
                  currentQuestionIndex: nextQuestionIndex,
                  currentRound: undefined
                });
              }
            }}
          />
        );
      
      case 'game-end':
        return (
          <FinalResults
            gameRoom={gameRoom}
            onPlayAgain={() => {
              // Reset game
              const resetRoom = {
                ...gameRoom,
                gameState: 'question-display' as GameState,
                currentQuestionIndex: 0,
                rounds: [],
                currentRound: undefined,
                players: gameRoom.players.map(p => ({ ...p, score: 0 }))
              };
              setGameRoom(resetRoom);
            }}
            onReturnToMenu={() => navigate('/')}
          />
        );
      
      default:
        return <div>Loading...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      {renderGamePhase()}
    </div>
  );
}