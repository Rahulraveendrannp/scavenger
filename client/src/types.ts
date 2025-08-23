export interface GameSession {
  userId: string;
  startTime: number;
  route: ClueItem[];
  qrsScanned: number;
  totalCheckpoints: number;
  hintCredits: number;
}

export interface ClueItem {
  id: number;
  location: string;
  clue: string;
  hint?: string;
  isCompleted: boolean;
  isExpanded?: boolean;
}

export interface LeaderboardEntry {
  phone: string;
  time: number;
  tier: RewardTier;
  completedAt: string;
}

export type RewardTier = "Gold" | "Silver" | "Bronze";

export type ViewState =
  | "landing"
  | "registration"
  | "otp"
  | "game"
  | "complete"
  | "leaderboard";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OTPVerificationResponse {
  success: boolean;
  session?: GameSession;
  error?: string;
}

export interface QRScanResponse {
  success: boolean;
  isValid: boolean;
  nextClue?: string;
  gameComplete?: boolean;
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface GameProgress {
  totalFound: number;
  totalCheckpoints: number;
  currentTier: RewardTier;
  isCompleted: boolean;
  hintCredits: number;
}
