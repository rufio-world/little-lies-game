import { supabase } from "@/integrations/supabase/client";

export interface PlayerProfile {
  name: string;
  avatar: string;
  isGuest: boolean;
  guestId?: string;
}

export interface CurrentPlayer {
  id: string;
  roomId: string;
  isHost: boolean;
}

export interface GameSettings {
  language: 'en' | 'es';
  playerProfile: PlayerProfile;
}

const STORAGE_KEYS = {
  LANGUAGE: 'littleLiesLanguage',
  PLAYER_PROFILE: 'littleLiesProfile',
  OWNED_PACKS: 'littleLiesOwnedPacks',
  CURRENT_PLAYER: 'littleLiesCurrentPlayer',
} as const;

class StorageManager {
  // Get player profile - checks auth first, then falls back to local storage
  async getPlayerProfile(): Promise<PlayerProfile> {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Fetch profile from Supabase
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, avatar')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profile && !error) {
        return {
          name: profile.username || 'Player',
          avatar: profile.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${session.user.id}`,
          isGuest: false
        };
      }
    }
    
    // Fall back to local storage (guest profile)
    return this.getLocalPlayerProfile();
  }

  // Language
  getLanguage(): 'en' | 'es' {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE) as 'en' | 'es' || 'en';
  }

  setLanguage(language: 'en' | 'es') {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }

  // Player Profile (local storage only)
  getLocalPlayerProfile(): PlayerProfile {
    const saved = localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse player profile:', e);
      }
    }
    
    // Default guest profile
    return this.createGuestProfile();
  }

  setPlayerProfile(profile: PlayerProfile) {
    localStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, JSON.stringify(profile));
  }

  createGuestProfile(): PlayerProfile {
    const guestNames = ['Big Brain', 'Smart Pants', 'Gamer', 'Trivia Master', 'Quiz Ninja', 'I know it all'];
    const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return {
      name: `${randomName}_${randomId}`,
      avatar: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${randomId}`,
      isGuest: true,
      guestId: randomId
    };
  }

  // Owned Packs
  getOwnedPacks(): string[] {
    const saved = localStorage.getItem(STORAGE_KEYS.OWNED_PACKS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse owned packs:', e);
      }
    }
    return ['pop_culture']; // Pop Culture is free by default
  }

  setOwnedPacks(packs: string[]) {
    localStorage.setItem(STORAGE_KEYS.OWNED_PACKS, JSON.stringify(packs));
  }

  addOwnedPack(packId: string) {
    const owned = this.getOwnedPacks();
    if (!owned.includes(packId)) {
      owned.push(packId);
      this.setOwnedPacks(owned);
    }
  }

  // Current Player
  getCurrentPlayer(): CurrentPlayer | null {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse current player:', e);
      }
    }
    return null;
  }

  setCurrentPlayer(player: CurrentPlayer) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER, JSON.stringify(player));
  }

  clearCurrentPlayer() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYER);
  }

  // Clear all data
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const storage = new StorageManager();
