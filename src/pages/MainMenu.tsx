import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Users, Settings, Store, Trophy, LogOut, LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
      <div className="flex flex-wrap justify-between items-center p-3 md:p-4 gap-2">
        <div className="flex items-center gap-1 md:gap-2">
          {user ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/settings')}
                className="hover:bg-primary/10 text-xs md:text-sm"
              >
                <User className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="hover:bg-destructive/10 text-xs md:text-sm"
              >
                <LogOut className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <div className="flex gap-1 md:gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/auth')}
                className="hover:bg-primary/10 text-xs md:text-sm"
              >
                <LogIn className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate('/auth#signup')}
                className="hover:bg-primary/90 text-xs md:text-sm"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
        <LanguageToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="text-center mb-6 md:mb-8">
          <img 
            src="/LITTLE LIES.svg" 
            alt="Little Lies Logo" 
            className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 mx-auto mb-4 md:mb-6"
          />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3 md:mb-4 px-2">
            {t('mainMenu.title')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">
            {t('mainMenu.subtitle')}
          </p>
        </div>

        <Card className="w-full max-w-md mx-2">
          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.key}
                  variant={item.primary ? "default" : "outline"}
                  size="lg"
                  className="w-full justify-start gap-2 md:gap-3 text-base md:text-lg h-11 md:h-12"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  {t(`mainMenu.${item.key}`)}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 md:mt-8">
          <Button
            variant="ghost"
            className="text-muted-foreground text-sm md:text-base"
            onClick={() => window.close()}
          >
            <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-2" />
            {t('mainMenu.quit')}
          </Button>
        </div>
      </div>
    </div>
  );
}