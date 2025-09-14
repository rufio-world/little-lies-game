import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { GameRoom, Question } from "@/lib/gameState";
import { Clock, Users, Trophy, Lightbulb } from "lucide-react";

interface AnswerSubmissionProps {
  question: Question;
  gameRoom: GameRoom;
  currentPlayer: any;
  onSubmitAnswer: (answer: string) => void;
}

export function AnswerSubmission({ question, gameRoom, currentPlayer, onSubmitAnswer }: AnswerSubmissionProps) {
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds to write answer
  const [submitted, setSubmitted] = useState(false);
  
  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted) {
      // Auto submit if time runs out
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  const handleSubmit = () => {
    if (submitted) return;
    
    const finalAnswer = answer.trim() || "No answer provided";
    setSubmitted(true);
    onSubmitAnswer(finalAnswer);
  };

  const progress = ((60 - timeLeft) / 60) * 100;

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
                <span className="text-sm font-medium">Time to Submit Answer</span>
                <Badge variant={timeLeft <= 15 ? "destructive" : "secondary"}>
                  {timeLeft}s
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question & Answer Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!submitted ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Strategy Tip
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Create an answer that sounds plausible but isn't too obvious. 
                      Think about what other players might expect the real answer to be!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your fake answer here... Make it convincing!"
                  className="h-32 resize-none"
                  disabled={submitted}
                />
                <Button 
                  onClick={handleSubmit}
                  disabled={!answer.trim() || submitted}
                  className="w-full"
                  size="lg"
                >
                  Submit Your Answer
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  Answer Submitted! ✓
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  Waiting for other players to submit their answers...
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Your answer:</p>
                <p className="font-medium">{answer}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Players</CardTitle>
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
                <Badge variant={submitted && player.id === currentPlayer.id ? "default" : "secondary"}>
                  {submitted && player.id === currentPlayer.id ? "Submitted" : "Writing..."}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}