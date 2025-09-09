import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { storage, type PlayerProfile } from "@/lib/storage";
import { ArrowLeft, Upload, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PlayerProfile>(storage.getPlayerProfile());
  const [isGuestMode, setIsGuestMode] = useState(profile.isGuest);

  useEffect(() => {
    const currentProfile = storage.getPlayerProfile();
    setProfile(currentProfile);
    setIsGuestMode(currentProfile.isGuest);
  }, []);

  const handleSaveProfile = () => {
    if (!profile.name.trim()) {
      toast({
        title: t('common.error'),
        description: "Player name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    storage.setPlayerProfile(profile);
    toast({
      title: t('settings.save'),
      description: "Settings saved successfully"
    });
  };

  const toggleGuestMode = (enabled: boolean) => {
    setIsGuestMode(enabled);
    if (enabled) {
      const guestProfile = storage.createGuestProfile();
      setProfile(guestProfile);
    } else {
      setProfile({
        name: "Player",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=player",
        isGuest: false
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfile({ ...profile, avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const useDefaultAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setProfile({ 
      ...profile, 
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomSeed}` 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <LanguageToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Guest Mode Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="guest-mode">{t('settings.guestMode')}</Label>
              <Switch
                id="guest-mode"
                checked={isGuestMode}
                onCheckedChange={toggleGuestMode}
              />
            </div>

            {/* Profile Preview */}
            <div className="flex justify-center">
              <PlayerAvatar
                name={profile.name}
                avatar={profile.avatar}
                isGuest={profile.isGuest}
                size="lg"
              />
            </div>

            {/* Player Name */}
            <div className="space-y-2">
              <Label htmlFor="player-name">{t('settings.playerName')}</Label>
              <Input
                id="player-name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={isGuestMode}
                placeholder={t('settings.playerName')}
              />
            </div>

            {/* Profile Image */}
            <div className="space-y-4">
              <Label>{t('settings.profileImage')}</Label>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isGuestMode}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Label 
                    htmlFor="avatar-upload" 
                    className="flex items-center justify-center gap-2 h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    {t('settings.uploadImage')}
                  </Label>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={useDefaultAvatar}
                  disabled={isGuestMode}
                  className="flex-1"
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  {t('settings.defaultAvatar')}
                </Button>
              </div>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <Label>{t('settings.language')}</Label>
              <LanguageToggle />
            </div>

            {/* Save Button */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                {t('settings.back')}
              </Button>
              <Button onClick={handleSaveProfile} className="flex-1">
                {t('settings.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}