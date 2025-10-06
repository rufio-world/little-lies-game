import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Play } from "lucide-react";
import { storage } from "@/lib/storage";
import { GameLogic } from "@/lib/gameState";
import { GameService } from "@/services/gameService";
import { useToast } from "@/hooks/use-toast";

export default function CreateGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [gameName, setGameName] = useState("My Little Lies Game");
  const [gameCode, setGameCode] = useState(GameLogic.generateGameCode());
  const [selectedPacks, setSelectedPacks] = useState<string[]>(["pop_culture"]);
  const [maxQuestions, setMaxQuestions] = useState<number>(10);
  const [language, setLanguage] = useState<"en" | "es">("en");

  const ownedPacks = storage.getOwnedPacks();

  const availablePacks = [
    { id: "pop_culture", nameKey: "packs.popCulture", free: true },
    { id: "travel_places", nameKey: "packs.travelPlaces", free: false },
    { id: "impossible", nameKey: "packs.impossible", free: false },
    { id: "troll_corner", nameKey: "packs.trollCorner", free: false },
    { id: "grandparents", nameKey: "packs.grandparents", free: false },
  ];

  const questionOptions = [
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 15, label: "15" },
    { value: -1, label: "∞" },
  ];

  const generateNewCode = () => {
    setGameCode(GameLogic.generateGameCode());
  };

  const togglePack = (packId: string) => {
    if (!ownedPacks.includes(packId)) {
      toast({
        title: t("common.error"),
        description: "You don't own this pack. Visit the store to purchase it.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPacks((prev) => (prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId]));
  };

  const handleCreateGame = async () => {
    if (!gameName.trim()) {
      toast({
        title: t("common.error"),
        description: "Please enter a game name",
        variant: "destructive",
      });
      return;
    }

    if (selectedPacks.length === 0) {
      toast({
        title: t("common.error"),
        description: "Please select at least one question pack",
        variant: "destructive",
      });
      return;
    }

    try {
      const profile = await storage.getPlayerProfile();
      const {
        gameCode: createdCode,
        roomId,
        playerId,
      } = await GameService.createGame({
        name: gameName,
        selectedPacks,
        maxQuestions,
        language,
        hostPlayer: {
          name: profile.name,
          avatar: profile.avatar,
          isGuest: profile.isGuest,
        },
      });

      // Store player info for the waiting room
      storage.setCurrentPlayer({
        id: playerId,
        roomId,
        isHost: true,
      });

      toast({
        title: "Game created!",
        description: `Room ${createdCode} is ready to play`,
      });

      // Navigate to waiting room
      navigate(`/waiting-room/${createdCode}`);
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Failed to create game",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t("createGame.title")}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("createGame.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Game Name */}
            <div className="space-y-2">
              <Label htmlFor="game-name">{t("createGame.gameName")}</Label>
              <Input
                id="game-name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder={t("createGame.gameName")}
              />
            </div>

            {/* Game Code */}
            <div className="space-y-2">
              <Label>{t("createGame.gameCode")}</Label>
              <div className="flex gap-2">
                <Input value={gameCode} readOnly className="font-mono text-lg text-center bg-muted" />
                <Button variant="outline" size="icon" onClick={generateNewCode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Question Packs */}
            <div className="space-y-3">
              <Label>{t("createGame.selectPacks")}</Label>
              <div className="space-y-2">
                {availablePacks.map((pack) => (
                  <div key={pack.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={pack.id}
                      checked={selectedPacks.includes(pack.id)}
                      onCheckedChange={() => togglePack(pack.id)}
                      disabled={!ownedPacks.includes(pack.id)}
                    />
                    <Label
                      htmlFor={pack.id}
                      className={`flex-1 ${!ownedPacks.includes(pack.id) ? "text-muted-foreground" : ""}`}
                    >
                      {t(pack.nameKey)}
                      {pack.free && (
                        <span className="ml-2 text-xs bg-success text-success-foreground px-2 py-0.5 rounded">
                          {t("store.free")}
                        </span>
                      )}
                      {!ownedPacks.includes(pack.id) && (
                        <span className="ml-2 text-xs bg-warning text-warning-foreground px-2 py-0.5 rounded">
                          {t("store.premium")}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label>{t("createGame.language")}</Label>
              <Select value={language} onValueChange={(value: "en" | "es") => setLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Number of Questions */}
            <div className="space-y-2">
              <Label>{t("createGame.numberOfQuestions")}</Label>
              <Select value={maxQuestions.toString()} onValueChange={(value) => setMaxQuestions(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Create Button */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                {t("createGame.back")}
              </Button>
              <Button onClick={handleCreateGame} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                {t("createGame.createRoom")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
