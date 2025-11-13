import { supabase } from "@/integrations/supabase/client";
import { Question } from "@/lib/gameState";

export interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  question_id: string;
  question_text: string;
  correct_answer: string;
  phase: 'answer-submission' | 'voting' | 'results';
  created_at: string;
  updated_at: string;
}

export interface PlayerAnswer {
  id: string;
  round_id: string;
  player_id: string;
  answer_text: string;
  submitted_at: string;
}

export interface PlayerVote {
  id: string;
  round_id: string;
  player_id: string;
  voted_for_answer_id?: string;
  voted_for_correct: boolean;
  voted_at: string;
}

export interface RoundReadiness {
  id: string;
  round_id: string;
  player_id: string;
  is_ready: boolean;
  marked_ready_at: string;
}

export class GameRoundService {
  // Create a new game round
  static async createRound(
    roomId: string,
    roundNumber: number,
    question: Question
  ): Promise<GameRound> {
    const { data, error } = await supabase
      .from('game_rounds')
      .insert([{
        room_id: roomId,
        round_number: roundNumber,
        question_id: question.id,
        question_text: question.question,
        correct_answer: question.correct_answer,
        phase: 'answer-submission'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as GameRound;
  }

  // Get current round for a room
  static async getCurrentRound(roomId: string): Promise<GameRound | null> {
    const { data, error } = await supabase
      .from('game_rounds_safe')
      .select('*')
      .eq('room_id', roomId)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const sanitized = {
      ...data,
      correct_answer: data.correct_answer ?? ''
    };

    return sanitized as GameRound | null;
  }

  // Submit player answer
  static async submitAnswer(roundId: string, playerId: string, answerText: string): Promise<PlayerAnswer> {
    const trimmedAnswer = answerText.trim();
    
    if (!trimmedAnswer) {
      throw new Error('Answer cannot be empty');
    }

    // Enforce answer length limits (2-200 characters) to prevent DoS and storage bloat
    if (trimmedAnswer.length < 2) {
      throw new Error('Answer must be at least 2 characters long');
    }
    if (trimmedAnswer.length > 200) {
      throw new Error('Answer must not exceed 200 characters');
    }

    // Check for duplicate answers (case-insensitive, exact match)
    const { data: existingAnswers, error: checkError } = await supabase
      .from('player_answers')
      .select('id, player_id, answer_text')
      .eq('round_id', roundId);

    if (checkError) throw checkError;

    // Check if any existing answer matches this one (case-insensitive)
    const isDuplicate = existingAnswers?.some(
      answer => answer.answer_text.toLowerCase() === trimmedAnswer.toLowerCase()
    );

    if (isDuplicate) {
      throw new Error('That answer has already been submitted. Please try a different one.');
    }

    // Update player's last_active_at timestamp
    await supabase
      .from('players')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', playerId);

    const { data, error } = await supabase
      .from('player_answers')
      .insert([{
        round_id: roundId,
        player_id: playerId,
        answer_text: trimmedAnswer
      }])
      .select()
      .single();

    if (error) throw error;
    return data as PlayerAnswer;
  }

  // Get all answers for a round
  static async getRoundAnswers(roundId: string): Promise<PlayerAnswer[]> {
    const { data, error } = await supabase
      .from('player_answers')
      .select('*')
      .eq('round_id', roundId)
      .order('submitted_at');

    if (error) throw error;
    return data as PlayerAnswer[];
  }

  // Submit player vote
  static async submitVote(
    roundId: string, 
    playerId: string, 
    votedForAnswerId?: string, 
    votedForCorrect: boolean = false
  ): Promise<PlayerVote> {
    // Update player's last_active_at timestamp
    await supabase
      .from('players')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', playerId);

    const { data, error } = await supabase
      .from('player_votes')
      .insert([{
        round_id: roundId,
        player_id: playerId,
        voted_for_answer_id: votedForAnswerId,
        voted_for_correct: votedForCorrect
      }])
      .select()
      .single();

    if (error) throw error;
    return data as PlayerVote;
  }

  // Get all votes for a round
  static async getRoundVotes(roundId: string): Promise<PlayerVote[]> {
    const { data, error } = await supabase
      .from('player_votes')
      .select('*')
      .eq('round_id', roundId)
      .order('voted_at');

    if (error) throw error;
    return data as PlayerVote[];
  }

  // Update round phase
  static async updateRoundPhase(roundId: string, phase: GameRound['phase']): Promise<void> {
    const { error } = await supabase
      .from('game_rounds')
      .update({ phase })
      .eq('id', roundId);

    if (error) throw error;
  }

  // Check if all players have submitted answers
  static async checkAllAnswersSubmitted(roundId: string, roomId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('are_all_answers_submitted', {
      p_round_id: roundId,
      p_room_id: roomId
    });

    if (error) {
      console.error('Error checking answer submission state:', error);
      return false;
    }

    return Boolean(data);
  }

  // Check if all players have voted
  static async checkAllVotesSubmitted(roundId: string, roomId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('are_all_votes_submitted', {
      p_round_id: roundId,
      p_room_id: roomId
    });

    if (error) {
      console.error('Error checking vote submission state:', error);
      return false;
    }

    return Boolean(data);
  }

  // Calculate round scores
  /**
   * SINGLE SOURCE OF TRUTH for scoring logic.
   * Called during phase advancement (GameRound.tsx) when all votes are submitted.
   * Do not duplicate this logic elsewhere—always call this method for score calculation.
   * 
   * Scoring rules:
   * - +1 point for voting for the correct answer
   * - +1 point for each player who votes for your fake answer (tricked them)
   * 
   * Results are persisted via updatePlayerScores() after calculation.
   */
  static async calculateRoundScores(roundId: string): Promise<Record<string, number>> {
    const [votes, answers] = await Promise.all([
      this.getRoundVotes(roundId),
      this.getRoundAnswers(roundId)
    ]);

    const scores: Record<string, number> = {};

    // Initialize scores
    answers.forEach(answer => {
      scores[answer.player_id] = 0;
    });


    // Award points for correct votes
    votes.forEach(vote => {
      if (vote.voted_for_correct) {
        scores[vote.player_id] = (scores[vote.player_id] || 0) + 1;
      }
    });

    // Award points for tricking other players
    votes.forEach(vote => {
      if (vote.voted_for_answer_id) {
        const answer = answers.find(a => a.id === vote.voted_for_answer_id);
        if (answer) {
          scores[answer.player_id] = (scores[answer.player_id] || 0) + 1;
        }
      }
    });

    return scores;
  }

  // Update player scores with proper SQL
  static async updatePlayerScores(roomId: string, scoreUpdates: Record<string, number>): Promise<void> {
    const updates = Object.entries(scoreUpdates).map(async ([playerId, scoreIncrease]) => {
      // First, fetch the current score
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerId)
        .eq('room_id', roomId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Then increment the score
      const newScore = (player?.score || 0) + scoreIncrease;
      
      const { error: updateError } = await supabase
        .from('players')
        .update({ score: newScore })
        .eq('id', playerId)
        .eq('room_id', roomId);
      
      if (updateError) throw updateError;
    });

    await Promise.all(updates);
  }

  // Mark player as ready for next round
  static async markPlayerReady(roundId: string, playerId: string): Promise<RoundReadiness> {
    // Update player's last_active_at timestamp
    await supabase
      .from('players')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', playerId);

    const { data, error } = await supabase
      .from('round_readiness')
      .upsert([{
        round_id: roundId,
        player_id: playerId,
        is_ready: true
      }], {
        onConflict: 'round_id,player_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data as RoundReadiness;
  }

  // Get readiness status for a round
  static async getRoundReadiness(roundId: string): Promise<RoundReadiness[]> {
    const { data, error } = await supabase
      .from('round_readiness')
      .select('*')
      .eq('round_id', roundId);

    if (error) throw error;
    return data as RoundReadiness[];
  }

  // Check if all players are ready
  static async checkAllPlayersReady(roundId: string, roomId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('are_all_players_ready', {
      p_round_id: roundId,
      p_room_id: roomId
    });

    if (error) {
      console.error('Error checking readiness state:', error);
      return false;
    }

    return Boolean(data);
  }
}
