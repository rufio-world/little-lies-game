import { supabase } from '@/integrations/supabase/client';
import { GameLogic } from '@/lib/gameState';
import { PLAYER_INACTIVITY_LIMIT_MS } from '@/lib/constants';
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

type PlayerMembership = {
  room_id: string;
  is_host: boolean;
  connected: boolean | null;
  last_active_at: string | null;
};

export class GameService {
  static async createGame(params: CreateGameParams): Promise<{ gameCode: string; roomId: string; playerId: string }> {
    const gameCode = GameLogic.generateGameCode();
    const user = await this.requireAuthenticatedUser('create a game');

    let existingMembership = await this.getExistingPlayerRecord(user.id);
    if (existingMembership && this.isMembershipStale(existingMembership)) {
      const cleaned = await this.tryCleanupExistingMembership(existingMembership, user.id);
      if (cleaned) {
        existingMembership = null;
      }
    }
    if (existingMembership) {
      const roomCode = await this.getRoomCode(existingMembership.room_id);
      throw new Error(
        roomCode
          ? `You are still listed in game ${roomCode}. Please finish or leave it before creating a new one.`
          : 'Please leave your current game before creating a new one.'
      );
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
    let existingMembership = await this.getExistingPlayerRecord(user.id);
    if (existingMembership && this.isMembershipStale(existingMembership)) {
      const cleaned = await this.tryCleanupExistingMembership(existingMembership, user.id);
      if (cleaned) {
        existingMembership = null;
      }
    }

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

      const cleaned = await this.tryCleanupExistingMembership(existingMembership, user.id);
      if (!cleaned) {
        const blockingCode = await this.getRoomCode(existingMembership.room_id);
        throw new Error(
          blockingCode
            ? `You are still part of game ${blockingCode}. Please leave it before joining another one.`
            : 'Please leave your current game before joining another one.'
        );
      }
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
    const { data: playerRecord, error: fetchError } = await supabase
      .from('players')
      .select('room_id, is_host')
      .eq('id', playerId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to look up player: ${fetchError.message}`);
    }

    if (!playerRecord) {
      return;
    }

    const roomId = playerRecord.room_id;
    const wasHost = playerRecord.is_host;

    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (deleteError) {
      throw new Error(`Failed to leave game: ${deleteError.message}`);
    }

    if (wasHost) {
      const { data: nextHost, error: nextHostError } = await supabase
        .from('players')
        .select('id, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextHostError) {
        console.error('Failed to find next host:', nextHostError);
      }

      if (nextHost?.id) {
        await supabase
          .from('players')
          .update({ is_host: true })
          .eq('id', nextHost.id);

        await supabase
          .from('game_rooms')
          .update({ host_id: nextHost.id })
          .eq('id', roomId);
      } else {
        await supabase
          .from('game_rooms')
          .update({ game_state: 'game-end' })
          .eq('id', roomId);
      }
    } else {
      const { count, error: remainingError } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (!remainingError && (count ?? 0) === 0) {
        await supabase
          .from('game_rooms')
          .update({ game_state: 'game-end' })
          .eq('id', roomId);
      }
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

  private static async getExistingPlayerRecord(userId: string): Promise<PlayerMembership | null> {
    const { data, error } = await supabase
      .from('players')
      .select('room_id, is_host, connected, last_active_at')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing player record:', error);
      throw new Error('Unable to verify existing game participation');
    }

    return data ?? null;
  }

  private static isMembershipStale(membership: PlayerMembership): boolean {
    if (membership.connected === false) {
      return true;
    }
    if (!membership.last_active_at) {
      return true;
    }
    const lastActive = new Date(membership.last_active_at).getTime();
    if (!Number.isFinite(lastActive)) {
      return true;
    }
    return Date.now() - lastActive > PLAYER_INACTIVITY_LIMIT_MS;
  }

  private static async tryCleanupExistingMembership(
    membership: PlayerMembership,
    userId: string
  ): Promise<boolean> {
    if (membership.is_host) {
      // Only auto-clean host rooms if no other players remain
      const { count, error: countError } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', membership.room_id)
        .neq('id', userId);

      if (countError) {
        console.error('Unable to count players for cleanup:', countError);
        return false;
      }

      if ((count ?? 0) > 0) {
        // Other players are still in this room; do not delete automatically
        return false;
      }

      const { error: roomDeleteError } = await supabase
        .from('game_rooms')
        .delete()
        .eq('id', membership.room_id)
        .eq('host_id', userId);

      if (roomDeleteError) {
        console.error('Failed to delete abandoned host room:', roomDeleteError);
        return false;
      }

      return true;
    }

    try {
      await this.leaveGame(userId);
      return true;
    } catch (error) {
      console.error('Failed to remove player from previous game:', error);
      return false;
    }
  }

  static async disconnectInactivePlayers(roomId: string): Promise<void> {
    const cutoff = new Date(Date.now() - PLAYER_INACTIVITY_LIMIT_MS).toISOString();
    const { error } = await supabase
      .from('players')
      .update({ connected: false })
      .eq('room_id', roomId)
      .eq('connected', true)
      .or(`last_active_at.is.null,last_active_at.lt.${cutoff}`);

    if (error) {
      console.error('Failed to disconnect inactive players:', error);
      return;
    }

    const { count, error: activeCountError } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .or(`connected.eq.true,last_active_at.gte.${cutoff}`);

    if (activeCountError) {
      console.error('Failed to count active players:', activeCountError);
      return;
    }

    if ((count ?? 0) === 0) {
      const { error: finishError } = await supabase
        .from('game_rooms')
        .update({ game_state: 'game-end' })
        .eq('id', roomId);

      if (finishError) {
        console.error('Failed to finish inactive game:', finishError);
      }
    }
  }

  private static async getRoomCode(roomId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('code')
      .eq('id', roomId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch room code:', error);
      return null;
    }

    return data?.code ?? null;
  }

  static async leaveAnyActiveGame(): Promise<void> {
    try {
      const user = await this.requireAuthenticatedUser('sign out');
      const membership = await this.getExistingPlayerRecord(user.id);
      if (membership) {
        await this.leaveGame(user.id);
      }
    } catch (error) {
      console.error('Failed to leave active game before signing out:', error);
    }
  }
}
