import { supabase } from '@/integrations/supabase/client';
import { GameLogic } from '@/lib/gameState';

export interface CreateGameParams {
  name: string;
  selectedPacks: string[];
  maxQuestions: number;
  hostPlayer: {
    name: string;
    avatar: string;
    isGuest: boolean;
  };
}

export interface JoinGameParams {
  gameCode: string;
  player: {
    name: string;
    avatar: string;
    isGuest: boolean;
  };
}

export class GameService {
  static async createGame(params: CreateGameParams): Promise<{ gameCode: string; roomId: string; playerId: string }> {
    const gameCode = GameLogic.generateGameCode();
    
    // Create game room
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        code: gameCode,
        name: params.name,
        host_id: '', // Will be updated after creating the player
        selected_packs: params.selectedPacks,
        max_questions: params.maxQuestions,
        game_state: 'waiting'
      })
      .select()
      .single();

    if (roomError) {
      throw new Error(`Failed to create game room: ${roomError.message}`);
    }

    // Create host player
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: roomData.id,
        name: params.hostPlayer.name,
        avatar: params.hostPlayer.avatar,
        is_host: true,
        is_guest: params.hostPlayer.isGuest,
        score: 0,
        connected: true
      })
      .select()
      .single();

    if (playerError) {
      throw new Error(`Failed to create host player: ${playerError.message}`);
    }

    // Update room with host_id
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ host_id: playerData.id })
      .eq('id', roomData.id);

    if (updateError) {
      throw new Error(`Failed to update room host: ${updateError.message}`);
    }

    return {
      gameCode: roomData.code,
      roomId: roomData.id,
      playerId: playerData.id
    };
  }

  static async joinGame(params: JoinGameParams): Promise<{ roomId: string; playerId: string }> {
    // First check if game exists
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', params.gameCode)
      .single();

    if (roomError) {
      throw new Error('Game room not found');
    }

    if (roomData.game_state !== 'waiting') {
      throw new Error('Game has already started');
    }

    // Add player to the game
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: roomData.id,
        name: params.player.name,
        avatar: params.player.avatar,
        is_host: false,
        is_guest: params.player.isGuest,
        score: 0,
        connected: true
      })
      .select()
      .single();

    if (playerError) {
      throw new Error(`Failed to join game: ${playerError.message}`);
    }

    return {
      roomId: roomData.id,
      playerId: playerData.id
    };
  }

  static async leaveGame(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      throw new Error(`Failed to leave game: ${error.message}`);
    }
  }

  static async startGame(roomId: string, hostPlayerId: string): Promise<void> {
    // Verify the requester is the host before starting the game
    const { data: hostData, error: hostError } = await supabase
      .from('players')
      .select('is_host, room_id')
      .eq('id', hostPlayerId)
      .eq('room_id', roomId)
      .single();

    if (hostError || !hostData?.is_host) {
      throw new Error('Only the host can start the game');
    }

    const { error } = await supabase
      .from('game_rooms')
      .update({ game_state: 'question-display' })
      .eq('id', roomId);

    if (error) {
      throw new Error(`Failed to start game: ${error.message}`);
    }
  }

  static async kickPlayer(playerId: string, hostPlayerId: string): Promise<void> {
    // Verify the requester is the host
    const { data: hostData, error: hostError } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', hostPlayerId)
      .single();

    if (hostError || !hostData.is_host) {
      throw new Error('Only the host can kick players');
    }

    // Remove the player
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      throw new Error(`Failed to kick player: ${error.message}`);
    }
  }
}