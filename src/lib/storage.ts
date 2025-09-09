export interface PlayerProfile {
  name: string;
  avatar: string;
  isGuest: boolean;
  guestId?: string;
}

export interface GameSettings {
  language: 'en' | 'es';
  playerProfile: PlayerProfile;
}

const STORAGE_KEYS = {
  LANGUAGE: 'littleLiesLanguage',
  PLAYER_PROFILE: 'littleLiesProfile',
  OWNED_PACKS: 'littleLiesOwnedPacks',
} as const;

class StorageManager {
  // Language
  getLanguage(): 'en' | 'es' {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE) as 'en' | 'es' || 'en';
  }

  setLanguage(language: 'en' | 'es') {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }

  // Player Profile
  getPlayerProfile(): PlayerProfile {
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
    const guestNames = ['Player', 'Gamer', 'Trivia Master', 'Quiz Ninja', 'Brain'];
    const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return {
      name: `${randomName}_${randomId}`,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomId}`,
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

  // Clear all data
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const storage = new StorageManager();