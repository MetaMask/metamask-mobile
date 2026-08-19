export type PredictVenueId = string & { readonly __brand: 'PredictVenueId' };
export type PredictEntityId = string & { readonly __brand: 'PredictEntityId' };
export type PredictFeedId = string & { readonly __brand: 'PredictFeedId' };
export type PredictTimestamp = string & {
  readonly __brand: 'PredictTimestamp';
};
export type PredictDecimal = string & { readonly __brand: 'PredictDecimal' };
export type PredictHttpsUrl = string & { readonly __brand: 'PredictHttpsUrl' };
export type PredictHexColor = string & { readonly __brand: 'PredictHexColor' };

export const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;

export type PredictMarketStatus =
  | 'initialized'
  | 'active'
  | 'inactive'
  | 'closed'
  | 'determined'
  | 'disputed'
  | 'amended'
  | 'finalized';

export type PredictOutcomeSide = 'yes' | 'no';
export type PredictGameSelection = 'home' | 'away' | 'draw';

export interface PredictSport {
  id: PredictEntityId;
  label: string;
}

export interface PredictCompetition {
  id: PredictEntityId;
  label: string;
}

export interface PredictTeam {
  name: string;
  abbreviation?: string;
  logoUrl?: PredictHttpsUrl;
  primaryColor?: PredictHexColor;
}

export type PredictGameStatus =
  | 'scheduled'
  | 'in_progress'
  | 'delayed'
  | 'suspended'
  | 'postponed'
  | 'completed'
  | 'canceled';

export interface PredictGame {
  status: PredictGameStatus;
  homeTeam: PredictTeam;
  awayTeam: PredictTeam;
  score?: {
    home: string;
    away: string;
  };
  period?: string;
  clock?: string;
  observedAt: PredictTimestamp;
}

export interface PredictSportsContext {
  sport: PredictSport;
  competition?: PredictCompetition;
  game?: PredictGame;
}

export type PredictMarketHistoryRange = 'LIVE' | '1D' | '1W' | '1M' | '1Y';

export interface PredictMarketHistoryPoint {
  timestamp: PredictTimestamp;
  yesPrice: PredictDecimal;
  noPrice: PredictDecimal;
}

export interface PredictMarketHistory {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  range: PredictMarketHistoryRange;
  observedAt: PredictTimestamp;
  points: readonly PredictMarketHistoryPoint[];
}

export interface PredictOutcome {
  id: PredictEntityId;
  side: PredictOutcomeSide;
  label: string;
  askPrice?: PredictDecimal;
  bidPrice?: PredictDecimal;
  gameSelection?: PredictGameSelection;
}

export interface PredictMarket {
  id: PredictEntityId;
  question: string;
  outcomes: readonly [PredictOutcome, PredictOutcome];
  status: PredictMarketStatus;
  volume?: string;
  volume24h?: string;
  createdAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  opensAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  resolvesAt?: PredictTimestamp;
}

export interface PredictEvent {
  venueId: PredictVenueId;
  id: PredictEntityId;
  title: string;
  subtitle?: string;
  startsAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  description?: string;
  category?: string;
  volume?: string;
  volume24h?: string;
  imageUrl?: string;
  sports?: PredictSportsContext;
  markets: readonly PredictMarket[];
}

export interface FetchFeedParams {
  cursor?: string;
  limit?: number;
}

export interface PredictFeed {
  venueId: PredictVenueId;
  id: PredictFeedId;
  title: string;
  events: readonly PredictEvent[];
  nextCursor?: string;
}

export interface PredictVenueStatus {
  venueId: PredictVenueId;
  status: 'available' | 'degraded' | 'unavailable';
  checkedAt: PredictTimestamp;
}

export interface PredictReadOptions {
  signal?: AbortSignal;
}

export interface PredictQueryDescriptor<TKey extends readonly unknown[]> {
  queryKey: TKey;
  family: readonly unknown[];
  staleTime: number;
  scope: 'venue';
}
