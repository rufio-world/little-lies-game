import { supabase } from '@/integrations/supabase/client';
import { GameLogic } from '@/lib/gameState';
import type { User } from '@supabase/supabase-js';

export interface CreateGameParams {
  name: string;
  selectedPacks: string[];
  maxQuestions: number;
  language: 'en' | 'es';
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
    const user = await this.requireAuthenticatedUser('create a game');

    const existingMembership = await this.getExistingPlayerRecord(user.id);
    if (existingMembership) {
      throw new Error('Please leave your current game before creating a new one.');
    }
    
    // Generate room ID, use authenticated user ID as host player ID
    const roomId = crypto.randomUUID();
    const hostPlayerId = user.id;
    
    // Create game room with pre-generated ID (no select needed)
    const { error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        id: roomId,
        code: gameCode,
        name: params.name,
        host_id: hostPlayerId,
        selected_packs: params.selectedPacks,
        max_questions: params.maxQuestions,
        language: params.language,
        game_state: 'waiting'
      });

    if (roomError) {
      throw new Error(`Failed to create game room: ${roomError.message}`);
    }

    // Create host player with the pre-generated ID
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: hostPlayerId,
        room_id: roomId,
        name: params.hostPlayer.name,
        avatar: params.hostPlayer.avatar,
        is_host: true,
        is_guest: params.hostPlayer.isGuest,
        score: 0,
        connected: true,
        last_active_at: new Date().toISOString()
      });

    if (playerError) {
      throw new Error(`Failed to create host player: ${playerError.message}`);
    }

    return {
      gameCode,
      roomId,
      playerId: hostPlayerId
    };
  }

  static async joinGame(params: JoinGameParams): Promise<{ roomId: string; playerId: string }> {
    const user = await this.requireAuthenticatedUser('join a game');
    const normalizedCode = params.gameCode.toUpperCase();
    const existingMembership = await this.getExistingPlayerRecord(user.id);

    // Resolve the room via RPC to avoid exposing the full game_rooms table.
    // The RPC `get_room_by_code` is a SECURITY DEFINER function that returns
    // minimal fields (id, code, game_state) for the given code.
    // supabase client rpc typings are narrow in this project; cast to any to call our new RPC
    const { data: roomRows, error: rpcError } = await (supabase as any).rpc('get_room_by_code', { p_code: normalizedCode });

    if (rpcError) {
      console.error('RPC error resolving room by code:', rpcError);
      throw new Error('Game room not found');
    }

    // RPC returns a set; take the first row if present
    const roomData: any = Array.isArray(roomRows) ? roomRows[0] : roomRows;

    if (!roomData || !roomData.id) {
      throw new Error('Game room not found');
    }

    if (roomData.game_state !== 'waiting') {
      throw new Error('Game has already started');
    }

    if (existingMembership) {
      if (existingMembership.room_id === roomData.id) {
        const { error: reconnectError } = await supabase
          .from('players')
          .update({ connected: true, last_active_at: new Date().toISOString() })
          .eq('id', user.id)
          .eq('room_id', roomData.id);

        if (reconnectError) {
          console.error('Failed to refresh player connection state:', reconnectError);
        }

        return {
          roomId: roomData.id,
          playerId: user.id
        };
      }
      throw new Error('Please leave your current game before joining another one.');
    }

    // Add player to the game
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: user.id,
        room_id: roomData.id,
        name: params.player.name,
        avatar: params.player.avatar,
        is_host: false,
        is_guest: params.player.isGuest,
        score: 0,
        connected: true,
        last_active_at: new Date().toISOString()
      });

    if (playerError) {
      throw new Error(`Failed to join game: ${playerError.message}`);
    }

    return {
      roomId: roomData.id,
      playerId: user.id
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

  static async startGame(roomId: string, hostPlayerId: string, questionIds: string[]): Promise<void> {
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
      .update({ 
        game_state: 'question-display',
        question_ids: questionIds
      })
      .eq('id', roomId);

    if (error) {
      throw new Error(`Failed to start game: ${error.message}`);
    }
  }

  static async advanceToNextQuestion(roomId: string, hostPlayerId: string): Promise<number> {
    // Verify the requester is the host
    const { data: hostData, error: hostError } = await supabase
      .from('players')
      .select('is_host, room_id')
      .eq('id', hostPlayerId)
      .eq('room_id', roomId)
      .single();

    if (hostError || !hostData?.is_host) {
      throw new Error('Only the host can advance questions');
    }

    // Get current index and increment it
    const { data: roomData, error: fetchError } = await supabase
      .from('game_rooms')
      .select('current_question_index')
      .eq('id', roomId)
      .single();

    if (fetchError || !roomData) {
      throw new Error('Failed to fetch game room');
    }

    const nextIndex = roomData.current_question_index + 1;

    // Update the current question index
    const { error } = await supabase
      .from('game_rooms')
      .update({ 
        current_question_index: nextIndex
      })
      .eq('id', roomId);

    if (error) {
      throw new Error(`Failed to advance question: ${error.message}`);
    }

    return nextIndex;
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

  private static async requireAuthenticatedUser(action: string): Promise<User> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error(`You must be logged in to ${action}`);
    }
    return user;
  }

  private static async getExistingPlayerRecord(userId: string): Promise<{ room_id: string } | null> {
    const { data, error } = await supabase
      .from('players')
      .select('room_id')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing player record:', error);
      throw new Error('Unable to verify existing game participation');
    }

    return data ?? null;
  }
}
