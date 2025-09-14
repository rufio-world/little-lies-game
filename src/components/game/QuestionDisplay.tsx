import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GameRoom, Question } from "@/lib/gameState";
import { Clock, Users, Trophy } from "lucide-react";

interface QuestionDisplayProps {
  question: Question;
  gameRoom: GameRoom;
  onContinue: () => void;
}

export function QuestionDisplay({ question, gameRoom, onContinue }: QuestionDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds to read question
  
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto continue after reading time
      onContinue();
    }
  }, [timeLeft, onContinue]);

  const progress = ((10 - timeLeft) / 10) * 100;

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
                <span className="text-sm font-medium">Reading Time</span>
                <Badge variant="secondary">{timeLeft}s</Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center text-xl">Get ready to create a fake answer!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-primary">{question.question}</h2>
            <p className="text-muted-foreground">
              Your goal is to create a convincing fake answer that will fool other players!
            </p>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How to play:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Write a fake answer that sounds believable</li>
              <li>• Try to trick other players into voting for your answer</li>
              <li>• You'll earn points for every player you fool</li>
              <li>• You also earn points if you guess the correct answer</li>
            </ul>
          </div>

          <Button 
            onClick={onContinue} 
            className="w-full"
            size="lg"
          >
            Start Writing Your Answer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}