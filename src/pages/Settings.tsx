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
import { ArrowLeft, UserCircle, Eye, EyeOff, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface UserProfile {
  id: string;
  username: string | null;
  avatar: string | null;
  games_played: number;
  games_won: number;
  total_points: number;
  second_places: number;
  players_tricked: number;
  times_tricked: number;
}

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<PlayerProfile>(storage.getPlayerProfile());
  const [isGuestMode, setIsGuestMode] = useState(profile.isGuest);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentProfile = storage.getPlayerProfile();
    setProfile(currentProfile);
    setIsGuestMode(currentProfile.isGuest);

    // If user is authenticated, fetch their profile
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    setUserProfile(data);
  };

  const handleSaveProfile = async () => {
    if (user && userProfile) {
      // Save authenticated user profile
      if (!userProfile.username?.trim()) {
        toast({
          title: t('common.error'),
          description: "Username cannot be empty",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: userProfile.username,
          avatar: userProfile.avatar
        })
        .eq('id', user.id);

      if (error) {
        toast({
          title: t('common.error'),
          description: "Failed to update profile",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: t('settings.save'),
        description: "Profile saved successfully"
      });
    } else {
      // Save guest profile
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
    }
  };

  const toggleGuestMode = (enabled: boolean) => {
    setIsGuestMode(enabled);
    setProfile(prevProfile => ({
      ...prevProfile,
      isGuest: enabled
    }));
  };

  const avatarOptions = [
    // People Archetypes
    "https://api.dicebear.com/7.x/adventurer/svg?seed=ninja",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=pirate",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=firefighter",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=clown",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=wizard",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=knight",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=doctor",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=detective",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=chef",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=artist",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=musician",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=teacher",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=pilot",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=astronaut",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=superhero",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=cowboy",
    
    // Fantastic Creatures
    "https://api.dicebear.com/7.x/bottts/svg?seed=dragon",
    "https://api.dicebear.com/7.x/bottts/svg?seed=phoenix",
    "https://api.dicebear.com/7.x/bottts/svg?seed=unicorn",
    "https://api.dicebear.com/7.x/bottts/svg?seed=griffin",
    "https://api.dicebear.com/7.x/bottts/svg?seed=kraken",
    "https://api.dicebear.com/7.x/bottts/svg?seed=fairy",
    "https://api.dicebear.com/7.x/bottts/svg?seed=demon",
    "https://api.dicebear.com/7.x/bottts/svg?seed=angel",
    "https://api.dicebear.com/7.x/bottts/svg?seed=vampire",
    "https://api.dicebear.com/7.x/bottts/svg?seed=ghost",
    "https://api.dicebear.com/7.x/bottts/svg?seed=troll",
    "https://api.dicebear.com/7.x/bottts/svg?seed=elf",
    "https://api.dicebear.com/7.x/bottts/svg?seed=goblin",
    "https://api.dicebear.com/7.x/bottts/svg?seed=orc",
    "https://api.dicebear.com/7.x/bottts/svg?seed=centaur",
    "https://api.dicebear.com/7.x/bottts/svg?seed=mermaid",
    
    // Animals
    "https://api.dicebear.com/7.x/lorelei/svg?seed=lion",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=eagle",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=wolf",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=bear",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=fox",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=owl",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=shark",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=tiger",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=elephant",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=dolphin",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=panda",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=penguin",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=rabbit",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=cat",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=dog",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=horse",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=monkey",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=snake",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=turtle",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=octopus",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=giraffe",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=zebra",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=kangaroo",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=koala",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=hippo",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=rhino",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=deer",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=moose",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=buffalo",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=raccoon",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=squirrel",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=beaver",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=hedgehog",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=flamingo",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=parrot",
  ];

  const handleAvatarChange = (avatarUrl: string) => {
    if (user && userProfile) {
      setUserProfile({ ...userProfile, avatar: avatarUrl });
    } else {
      setProfile({ ...profile, avatar: avatarUrl });
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    try {
      passwordSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword
      });

      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Password updated successfully"
        });
        setShowPasswordForm(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const currentProfileData = user && userProfile ? userProfile : profile;
  const isAuthenticated = !!user;

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
            <CardTitle>{isAuthenticated ? "Profile Settings" : t('settings.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Authentication Status */}
            {isAuthenticated && userProfile && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-medium text-primary mb-2">Account Status: Authenticated</h3>
                <p className="text-sm text-muted-foreground">
                  You're signed in and your progress is saved to your account.
                </p>
              </div>
            )}

            {/* Guest Mode Toggle - Only show for non-authenticated users */}
            {!isAuthenticated && (
              <div className="flex items-center justify-between">
                <Label htmlFor="guest-mode">{t('settings.guestMode')}</Label>
                <Switch
                  id="guest-mode"
                  checked={isGuestMode}
                  onCheckedChange={toggleGuestMode}
                />
              </div>
            )}

            {/* Profile Preview */}
            <div className="flex justify-center">
              <PlayerAvatar
                name={isAuthenticated && userProfile ? userProfile.username || 'Player' : profile.name}
                avatar={isAuthenticated && userProfile ? userProfile.avatar || '' : profile.avatar}
                isGuest={!isAuthenticated}
                size="lg"
              />
            </div>

            {/* User/Player Name */}
            <div className="space-y-2">
              <Label htmlFor="player-name">
                {isAuthenticated ? "Username" : t('settings.playerName')}
              </Label>
              <Input
                id="player-name"
                value={isAuthenticated && userProfile ? userProfile.username || '' : profile.name}
                onChange={(e) => {
                  if (isAuthenticated && userProfile) {
                    setUserProfile({ ...userProfile, username: e.target.value });
                  } else {
                    setProfile({ ...profile, name: e.target.value });
                  }
                }}
                disabled={isGuestMode && !isAuthenticated}
                placeholder={isAuthenticated ? "Enter username" : t('settings.playerName')}
              />
            </div>

            {/* Avatar Selection */}
            <div className="space-y-4">
              <Label>Choose Avatar</Label>
              
              <div className="grid grid-cols-6 gap-3 max-h-48 overflow-y-auto p-3 border rounded-lg bg-secondary/10">
                {avatarOptions.map((avatarUrl, index) => {
                  const currentAvatar = isAuthenticated && userProfile ? userProfile.avatar : profile.avatar;
                  const isSelected = currentAvatar === avatarUrl;
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAvatarChange(avatarUrl)}
                      disabled={isGuestMode && !isAuthenticated}
                      className={`
                        relative w-12 h-12 rounded-full border-2 transition-all hover:scale-110
                        ${isSelected 
                          ? 'border-primary ring-2 ring-primary/30 scale-110' 
                          : 'border-border hover:border-primary/50'
                        }
                        ${isGuestMode && !isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <img 
                        src={avatarUrl} 
                        alt=""
                        className="w-full h-full rounded-full"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Statistics - Only for authenticated users */}
            {isAuthenticated && userProfile && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Statistics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-secondary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProfile.games_played}</div>
                    <div className="text-sm text-muted-foreground">Games Played</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProfile.games_won}</div>
                    <div className="text-sm text-muted-foreground">Games Won</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProfile.total_points}</div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProfile.second_places}</div>
                    <div className="text-sm text-muted-foreground">Second Places</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProfile.players_tricked}</div>
                    <div className="text-sm text-muted-foreground">Players Tricked</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProfile.times_tricked}</div>
                    <div className="text-sm text-muted-foreground">Times Tricked</div>
                  </div>
                </div>
              </div>
            )}

            {/* Password Change - Only for authenticated users */}
            {isAuthenticated && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Security</Label>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    Change Password
                  </Button>
                </div>

                {showPasswordForm && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPasswords.current ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPasswords.new ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordChange}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Language */}
            <div className="flex items-center justify-between">
              <Label>{t('settings.language')}</Label>
              <LanguageToggle />
            </div>

            {/* Save/Sign In Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                {t('settings.back')}
              </Button>
              {isAuthenticated ? (
                <Button onClick={handleSaveProfile} className="flex-1">
                  Save Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleSaveProfile} variant="outline" className="flex-1">
                    {t('settings.save')}
                  </Button>
                  <Button onClick={() => navigate('/auth')} className="flex-1">
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}