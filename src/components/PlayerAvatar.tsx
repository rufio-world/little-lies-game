import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";

interface PlayerAvatarProps {
  name: string;
  avatar: string;
  isHost?: boolean;
  isGuest?: boolean;
  score?: number;
  size?: "sm" | "md" | "lg";
}

export function PlayerAvatar({ 
  name, 
  avatar, 
  isHost = false, 
  isGuest = false, 
  score,
  size = "md" 
}: PlayerAvatarProps) {
  const { t } = useTranslation();
  
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        
        {isHost && (
          <Badge 
            variant="secondary" 
            className="absolute -top-1 -right-1 text-xs px-1 py-0 bg-game-accent text-game-accent-foreground"
          >
            HOST
          </Badge>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium truncate max-w-20">
          {name}
          {isGuest && (
            <span className="text-xs text-muted-foreground ml-1">
              ({t('leaderboard.guest')})
            </span>
          )}
        </p>
        
        {score !== undefined && (
          <p className="text-xs text-muted-foreground">
            {score} pts
          </p>
        )}
      </div>
    </div>
  );
}