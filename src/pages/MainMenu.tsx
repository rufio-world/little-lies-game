import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Users, Settings, Store, Trophy, LogOut, LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

export default function MainMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const menuItems = [
    {
      key: 'newGame',
      icon: Gamepad2,
      path: '/create-game',
      primary: true
    },
    {
      key: 'joinGame', 
      icon: Users,
      path: '/join-game',
      primary: true
    },
    {
      key: 'settings',
      icon: Settings,
      path: '/settings',
      primary: false
    },
    {
      key: 'store',
      icon: Store, 
      path: '/store',
      primary: false
    },
    {
      key: 'leaderboard',
      icon: Trophy,
      path: '/leaderboard',
      primary: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/settings')}
                className="hover:bg-primary/10"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/auth')}
                className="hover:bg-primary/10"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate('/auth#signup')}
                className="hover:bg-primary/90"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
        <LanguageToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="Little Lies Logo" 
            className="w-32 h-32 mx-auto mb-6"
          />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            {t('mainMenu.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('mainMenu.subtitle')}
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.key}
                  variant={item.primary ? "default" : "outline"}
                  size="lg"
                  className="w-full justify-start gap-3 text-lg h-12"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-5 w-5" />
                  {t(`mainMenu.${item.key}`)}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => window.close()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('mainMenu.quit')}
          </Button>
        </div>
      </div>
    </div>
  );
}