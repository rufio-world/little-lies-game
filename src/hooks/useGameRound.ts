import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameRound, PlayerAnswer, PlayerVote, GameRoundService } from '@/services/gameRoundService';

interface UseGameRoundReturn {
  currentRound: GameRound | null;
  answers: PlayerAnswer[];
  votes: PlayerVote[];
  loading: boolean;
  error: string | null;
  hasSubmittedAnswer: boolean;
  hasVoted: boolean;
  allAnswersSubmitted: boolean;
  allVotesSubmitted: boolean;
}

export function useGameRound(roomId: string, playerId: string): UseGameRoundReturn {
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [votes, setVotes] = useState<PlayerVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived states
  const hasSubmittedAnswer = currentRound ? answers.some(a => a.player_id === playerId) : false;
  const hasVoted = currentRound ? votes.some(v => v.player_id === playerId) : false;

  // Load initial data
  useEffect(() => {
    if (!roomId) return;

    const loadRoundData = async () => {
      try {
        setLoading(true);
        const round = await GameRoundService.getCurrentRound(roomId);
        setCurrentRound(round);

        if (round) {
          const [roundAnswers, roundVotes] = await Promise.all([
            GameRoundService.getRoundAnswers(round.id),
            GameRoundService.getRoundVotes(round.id)
          ]);
          setAnswers(roundAnswers);
          setVotes(roundVotes);
        } else {
          setAnswers([]);
          setVotes([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load round data');
      } finally {
        setLoading(false);
      }
    };

    loadRoundData();
  }, [roomId]);

  // Reset answers and votes when round changes
  useEffect(() => {
    if (!currentRound) {
      setAnswers([]);
      setVotes([]);
      return;
    }

    // Immediately clear old data to prevent race conditions
    setAnswers([]);
    setVotes([]);

    const loadRoundData = async () => {
      try {
        const [roundAnswers, roundVotes] = await Promise.all([
          GameRoundService.getRoundAnswers(currentRound.id),
          GameRoundService.getRoundVotes(currentRound.id)
        ]);
        setAnswers(roundAnswers);
        setVotes(roundVotes);
      } catch (err) {
        console.error('Error loading round data:', err);
      }
    };

    loadRoundData();
  }, [currentRound?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!roomId) return;

    // Subscribe to round updates
    const roundsChannel = supabase
      .channel('game-rounds')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('Round update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setCurrentRound(payload.new as GameRound);
          }
        }
      )
      .subscribe();

    // Subscribe to answers updates
    const answersChannel = supabase
      .channel('player-answers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_answers'
        },
        async (payload) => {
          console.log('Answer update:', payload);
          if (currentRound && payload.new && (payload.new as PlayerAnswer).round_id === currentRound.id) {
            if (payload.eventType === 'INSERT') {
              setAnswers(prev => [...prev, payload.new as PlayerAnswer]);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to votes updates
    const votesChannel = supabase
      .channel('player-votes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_votes'
        },
        async (payload) => {
          console.log('Vote update:', payload);
          if (currentRound && payload.new && (payload.new as PlayerVote).round_id === currentRound.id) {
            if (payload.eventType === 'INSERT') {
              setVotes(prev => [...prev, payload.new as PlayerVote]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(answersChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [roomId, currentRound?.id]);

  // Check completion states
  const [allAnswersSubmitted, setAllAnswersSubmitted] = useState(false);
  const [allVotesSubmitted, setAllVotesSubmitted] = useState(false);

  useEffect(() => {
    if (!currentRound) return;

    const checkCompletion = async () => {
      const [answersComplete, votesComplete] = await Promise.all([
        GameRoundService.checkAllAnswersSubmitted(currentRound.id, roomId),
        GameRoundService.checkAllVotesSubmitted(currentRound.id, roomId)
      ]);
      setAllAnswersSubmitted(answersComplete);
      setAllVotesSubmitted(votesComplete);
    };

    checkCompletion();
  }, [answers.length, votes.length, currentRound, roomId]);

  return {
    currentRound,
    answers,
    votes,
    loading,
    error,
    hasSubmittedAnswer,
    hasVoted,
    allAnswersSubmitted,
    allVotesSubmitted
  };
}