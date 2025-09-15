import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameRoom, Player } from '@/lib/gameState';

interface DatabaseGameRoom {
  id: string;
  code: string;
  name: string;
  host_id: string;
  selected_packs: string[];
  max_questions: number;
  current_question_index: number;
  game_state: string;
  created_at: string;
  updated_at: string;
}

interface DatabasePlayer {
  id: string;
  room_id: string;
  name: string;
  avatar: string;
  score: number;
  is_host: boolean;
  is_guest: boolean;
  connected: boolean;
  created_at: string;
  updated_at: string;
}

export function useGameRoom(gameCode: string) {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameCode) return;

    let roomChannel: any;
    let playersChannel: any;

    const setupRealtimeSubscription = async () => {
      try {
        // Fetch initial game room data
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('code', gameCode)
          .single();

        if (roomError) {
          setError('Game room not found');
          setLoading(false);
          return;
        }

        // Fetch initial players data
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id);

        if (playersError) {
          console.error('Error fetching players:', playersError);
          setError('Error loading players');
          setLoading(false);
          return;
        }

        // Convert database format to app format
        const room: GameRoom = {
          id: roomData.id,
          code: roomData.code,
          name: roomData.name,
          hostId: roomData.host_id,
          players: [], // Will be populated from players subscription
          selectedPacks: roomData.selected_packs || [],
          maxQuestions: roomData.max_questions,
          currentQuestionIndex: roomData.current_question_index,
          gameState: roomData.game_state as any,
          rounds: [],
          createdAt: new Date(roomData.created_at).getTime()
        };

        const appPlayers: Player[] = playersData.map((p: DatabasePlayer) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          isHost: p.is_host,
          isGuest: p.is_guest
        }));

        setGameRoom(room);
        setPlayers(appPlayers);
        setLoading(false);

        // Subscribe to game room changes
        roomChannel = supabase
          .channel(`game_room_${roomData.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'game_rooms',
              filter: `id=eq.${roomData.id}`
            },
            (payload) => {
              const updatedRoom = payload.new as DatabaseGameRoom;
              setGameRoom(prev => prev ? {
                ...prev,
                name: updatedRoom.name,
                gameState: updatedRoom.game_state as any,
                currentQuestionIndex: updatedRoom.current_question_index
              } : null);
            }
          )
          .subscribe();

        // Subscribe to players changes
        playersChannel = supabase
          .channel(`players_${roomData.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'players',
              filter: `room_id=eq.${roomData.id}`
            },
            (payload) => {
              const newPlayer = payload.new as DatabasePlayer;
              const appPlayer: Player = {
                id: newPlayer.id,
                name: newPlayer.name,
                avatar: newPlayer.avatar,
                score: newPlayer.score,
                isHost: newPlayer.is_host,
                isGuest: newPlayer.is_guest
              };
              setPlayers(prev => [...prev, appPlayer]);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'players',
              filter: `room_id=eq.${roomData.id}`
            },
            (payload) => {
              const deletedPlayer = payload.old as DatabasePlayer;
              setPlayers(prev => prev.filter(p => p.id !== deletedPlayer.id));
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'players',
              filter: `room_id=eq.${roomData.id}`
            },
            (payload) => {
              const updatedPlayer = payload.new as DatabasePlayer;
              const appPlayer: Player = {
                id: updatedPlayer.id,
                name: updatedPlayer.name,
                avatar: updatedPlayer.avatar,
                score: updatedPlayer.score,
                isHost: updatedPlayer.is_host,
                isGuest: updatedPlayer.is_guest
              };
              setPlayers(prev => prev.map(p => p.id === appPlayer.id ? appPlayer : p));
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Error setting up game room:', err);
        setError('Failed to load game room');
        setLoading(false);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscriptions on unmount
    return () => {
      if (roomChannel) {
        supabase.removeChannel(roomChannel);
      }
      if (playersChannel) {
        supabase.removeChannel(playersChannel);
      }
    };
  }, [gameCode]);

  // Update game room with players
  useEffect(() => {
    if (gameRoom) {
      setGameRoom(prev => prev ? { ...prev, players } : null);
    }
  }, [players]);

  return {
    gameRoom: gameRoom ? { ...gameRoom, players } : null,
    loading,
    error
  };
}