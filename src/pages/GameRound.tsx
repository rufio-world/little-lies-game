import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { GameRoom, GameState, QuestionPack } from "@/lib/gameState";
import { Clock, Users, Trophy } from "lucide-react";
import popCultureEn from "@/data/popCulture.json";
import popCultureEs from "@/data/popCultureEs.json";

export default function GameRound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [playerAnswer, setPlayerAnswer] = useState("");

  useEffect(() => {
    if (!location.state?.gameRoom) {
      navigate('/');
      return;
    }

    const room = location.state.gameRoom as GameRoom;
    setGameRoom(room);

    // Load question packs based on selected packs
    const questionPacks: QuestionPack[] = [];
    if (room.selectedPacks.includes('pop_culture')) {
      questionPacks.push(popCultureEn as QuestionPack);
      questionPacks.push(popCultureEs as QuestionPack);
    }

    // Get first question
    if (questionPacks.length > 0) {
      const allQuestions = questionPacks.flatMap(pack => pack.questions);
      const firstQuestion = allQuestions[room.currentQuestionIndex];
      setCurrentQuestion(firstQuestion);
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up - submit answer
      handleSubmitAnswer();
    }
  }, [timeLeft]);

  const handleSubmitAnswer = () => {
    if (!gameRoom || !currentQuestion) return;

    toast({
      title: "Answer submitted!",
      description: playerAnswer || "No answer provided"
    });

    // TODO: Submit to Supabase and move to voting phase
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  if (!gameRoom || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  const progress = ((30 - timeLeft) / 30) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
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
              Round {gameRoom.currentQuestionIndex + 1}
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
                  <span className="text-sm font-medium">Time Remaining</span>
                  <Badge variant={timeLeft <= 10 ? "destructive" : "secondary"}>
                    {timeLeft}s
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                value={playerAnswer}
                onChange={(e) => setPlayerAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full h-24 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={timeLeft === 0}
              />
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!playerAnswer.trim() || timeLeft === 0}
                className="w-full"
              >
                Submit Answer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {gameRoom.players.map(player => (
                <div 
                  key={player.id}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                >
                  <PlayerAvatar 
                    name={player.name}
                    avatar={player.avatar}
                    isHost={player.isHost}
                    isGuest={player.isGuest}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {player.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}