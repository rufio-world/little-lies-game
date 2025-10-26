import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GameRoom, Question } from "@/lib/gameState";
import { GameRound, PlayerAnswer } from "@/services/gameRoundService";
import { Clock, Users, Trophy, Vote } from "lucide-react";

interface VotingPhaseProps {
  question: Question;
  gameRoom: GameRoom;
  currentPlayer: any;
  round: GameRound;
  answers: PlayerAnswer[];
  hasVoted: boolean;
  allVoted: boolean;
  onVote: (answerId: string, isCorrect: boolean) => Promise<void>;
}

export function VotingPhase({ 
  question, 
  gameRoom, 
  currentPlayer, 
  round, 
  answers, 
  hasVoted, 
  allVoted, 
  onVote 
}: VotingPhaseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(45);
  const [isVoting, setIsVoting] = useState(false);
  
  useEffect(() => {
    if (timeLeft > 0 && !hasVoted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasVoted && !isVoting) {
      // Auto vote for correct answer if time runs out
      handleVote("correct", true);
    }
  }, [timeLeft, hasVoted, isVoting]);

  const handleVote = async (answerId: string, isCorrect: boolean = false) => {
    if (hasVoted || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(answerId, isCorrect);
    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const progress = ((45 - timeLeft) / 45) * 100;
  
  // Create voting options: all player answers + correct answer
  const votingOptions = [
    // All player submitted answers (including current player's own answer)
    ...answers.map(answer => ({
      id: answer.id,
      text: answer.answer_text,
      isCorrect: false
    })),
    // Correct answer
    {
      id: 'correct',
      text: round.correct_answer,
      isCorrect: true
    }
  ];

  // Shuffle the voting options only once when answers change
  const shuffledOptions = useMemo(() => {
    return [...votingOptions].sort(() => Math.random() - 0.5);
  }, [answers.length, round.id]);

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

      {!hasVoted && !allVoted ? (
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
                  {question.question}
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
                {shuffledOptions.map((option, index) => (
                  <Button
                    key={option.id}
                    variant={selectedAnswer === option.id ? "default" : "outline"}
                    className="w-full text-left h-auto p-4"
                    onClick={() => setSelectedAnswer(option.id)}
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1 text-base">{option.text}</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={() => {
                  const selectedOption = shuffledOptions.find(o => o.id === selectedAnswer);
                  if (selectedOption) {
                    handleVote(selectedOption.id, selectedOption.isCorrect);
                  }
                }}
                disabled={!selectedAnswer || isVoting}
                className="w-full mt-4"
                size="lg"
              >
                {isVoting ? "Submitting..." : "Submit Vote"}
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
                  {hasVoted ? "Vote Submitted! ✓" : "All Votes In!"}
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  {allVoted ? "Calculating results..." : "Waiting for other players to vote..."}
                </p>
              </div>
              
              {hasVoted && selectedAnswer && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">You voted for:</p>
                  <p className="font-medium">
                    {shuffledOptions.find(o => o.id === selectedAnswer)?.text}
                  </p>
                </div>
              )}
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
                <Badge variant={hasVoted && player.id === currentPlayer.id ? "default" : "secondary"}>
                  {hasVoted && player.id === currentPlayer.id ? "Voted" : "Voting..."}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}