import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { GameRoom, Question } from "@/lib/gameState";
import { GameRound, PlayerAnswer } from "@/services/gameRoundService";
import { Clock, Users, Trophy, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface AnswerSubmissionProps {
  question: Question;
  gameRoom: GameRoom;
  currentPlayer: any;
  round: GameRound;
  hasSubmitted: boolean;
  allSubmitted: boolean;
  onSubmitAnswer: (answer: string) => Promise<void>;
}

export function AnswerSubmission({ 
  question, 
  gameRoom, 
  currentPlayer, 
  round, 
  hasSubmitted, 
  allSubmitted, 
  onSubmitAnswer 
}: AnswerSubmissionProps) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (timeLeft > 0 && !hasSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasSubmitted && !isSubmitting) {
      // Auto submit if time runs out
      handleSubmit();
    }
  }, [timeLeft, hasSubmitted, isSubmitting]);

  const handleSubmit = async () => {
    if (hasSubmitted || isSubmitting) return;
    
    const trimmedAnswer = answer.trim();
    
    if (!trimmedAnswer) {
      toast({
        title: gameRoom.language === 'es' ? "Respuesta vacía" : "Empty Answer",
        description: gameRoom.language === 'es' 
          ? "Por favor, ingresa una respuesta" 
          : "Please enter an answer",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(trimmedAnswer);
    } catch (error) {
      console.error('Error submitting answer:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit answer';
      toast({
        title: gameRoom.language === 'es' ? "Error" : "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((60 - timeLeft) / 60) * 100;

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
            {t('game.question')} {gameRoom.currentQuestionIndex + 1} {t('common.of')} {gameRoom.maxQuestions}
          </div>
        </div>
      </div>

      {/* Timer */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs md:text-sm font-medium">{t('game.timeToSubmit')}</span>
                <Badge variant={timeLeft <= 15 ? "destructive" : "secondary"} className="text-xs">
                  {timeLeft}s
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question & Answer Form */}
      <Card className="mb-4 md:mb-6">
        <CardHeader>
          <CardTitle className="text-base md:text-xl">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {!hasSubmitted && !allSubmitted ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2 md:gap-3">
                  <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm md:text-base">
                      {t('game.strategyTip')}
                    </h3>
                    <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300">
                      {t('game.strategyText')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.slice(0, 200))}
                    placeholder={t('game.typeFakeAnswer')}
                    className="h-32 resize-none"
                    disabled={hasSubmitted || isSubmitting}
                    maxLength={200}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{answer.length}/200 characters</span>
                    {answer.length > 180 && (
                      <Badge variant="outline" className="text-xs">Almost at limit</Badge>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={handleSubmit}
                  disabled={!answer.trim() || hasSubmitted || isSubmitting || answer.length > 200}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? t('common.loading') : t('game.submitYourAnswer')}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  {hasSubmitted ? `${t('game.answer')} ${t('game.submitted')}! ✓` : t('game.allAnswersRevealed')}
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  {allSubmitted ? t('game.voting') : t('game.waiting')}
                </p>
              </div>
              
              {hasSubmitted && answer && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">{t('game.yourAnswer')}:</p>
                  <p className="font-medium">{answer}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">{t('game.players')}</CardTitle>
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
                    <Badge variant="secondary" className="text-xs">{t('game.you')}</Badge>
                  )}
                </div>
                <Badge variant={hasSubmitted && player.id === currentPlayer.id ? "default" : "secondary"}>
                  {hasSubmitted && player.id === currentPlayer.id ? t('game.submitted') : t('game.writing')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}