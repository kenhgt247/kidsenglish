
export interface GameState {
  score: number;
  level: number;
  unlockedAvatars: string[];
  currentAvatar: string;
}

export interface FoodItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}
