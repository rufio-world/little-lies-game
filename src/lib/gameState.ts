export interface Question {
  id: string;
  question: string;
  correct_answer: string;
}

export interface QuestionPack {
  name: string;
  language: 'en' | 'es';
  theme: string;
  questions: Question[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isGuest: boolean;
}

export interface GameAnswer {
  id: string;
  playerId: string;
  answer: string;
  isCorrect: boolean;
  votes: string[]; // player IDs who voted for this
}

export interface GameRound {
  questionId: string;
  question: string;
  correctAnswer: string;
  answers: GameAnswer[];
  playerAnswers: Record<string, string>; // playerId -> answerId they submitted
  playerVotes: Record<string, string>; // playerId -> answerId they voted for
}

export type GameState = 
  | 'waiting'
  | 'question-display' 
  | 'answer-submission'
  | 'voting'
  | 'results'
  | 'game-end';

export interface GameRoom {
  id: string;
  code: string;
  name: string;
  hostId: string;
  players: Player[];
  selectedPacks: string[];
  maxQuestions: number;
  currentQuestionIndex: number;
  language: 'en' | 'es';
  questionIds?: string[]; // Ordered list of question IDs for the game
  currentRound?: GameRound;
  gameState: GameState;
  rounds: GameRound[];
  createdAt: number;
}

// Game logic utilities
export class GameLogic {
  static generateGameCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static calculateScores(round: GameRound, players: Player[]): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // Initialize scores
    players.forEach(player => {
      scores[player.id] = 0;
    });

    // Award points for correct votes
    Object.entries(round.playerVotes).forEach(([playerId, answerId]) => {
      const answer = round.answers.find(a => a.id === answerId);
      if (answer && answer.isCorrect) {
        scores[playerId] += 1;
      }
    });

    // Award points for fooling other players
    round.answers.forEach(answer => {
      if (!answer.isCorrect) {
        scores[answer.playerId] += answer.votes.length;
      }
    });

    return scores;
  }

  static createGameAnswers(playerAnswers: Record<string, string>, correctAnswer: string, question: string): GameAnswer[] {
    const answers: GameAnswer[] = [];
    
    // Add player answers
    Object.entries(playerAnswers).forEach(([playerId, answer]) => {
      answers.push({
        id: `player-${playerId}`,
        playerId,
        answer,
        isCorrect: false,
        votes: []
      });
    });

    // Add correct answer
    answers.push({
      id: 'correct',
      playerId: 'system',
      answer: correctAnswer,
      isCorrect: true,
      votes: []
    });

    // Shuffle answers
    return GameLogic.shuffleArray(answers);
  }
}

// Mock game state for development
export const createMockGameRoom = (): GameRoom => ({
  id: 'mock-room',
  code: 'MOCK1',
  name: 'Test Game',
  hostId: 'player-1',
  players: [
    {
      id: 'player-1',
      name: 'Alice',
      avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=alice',
      score: 0,
      isHost: true,
      isGuest: false
    }
  ],
  selectedPacks: ['pop_culture'],
  maxQuestions: 5,
  currentQuestionIndex: 0,
  language: 'en',
  gameState: 'waiting',
  rounds: [],
  createdAt: Date.now()
});