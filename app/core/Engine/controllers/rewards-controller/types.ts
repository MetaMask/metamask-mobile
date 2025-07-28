/**
 * Types for the RewardsController
 */

export interface GenerateChallengeDto {
  address: string;
}

export interface ChallengeResponseDto {
  id: string;
  message: string;
  domain?: string;
  address?: string;
  issuedAt?: string;
  expirationTime?: string;
  nonce?: string;
}

export interface LoginDto {
  challengeId: string;
  signature: string;
}

export interface JoinSubscriptionDto {
  challengeId: string;
  signature: string;
}

export interface DevOnlyLoginDto {
  address: string;
}

export interface SubscriptionDto {
  id: string;
  accounts: {
    address: string;
    chainId: number;
  }[];
}

export interface PointsEventDto {
  id: string;
  timestamp: string;
  type: string;
  payload?: SwapEventPayloadDto | BridgeEventPayloadDto;
  value?: number;
  accountAddress?: `0x${string}`;
  accountId?: string;
  subscriptionId?: string;
}

export interface ValueTransferDto {
  contractAddress?: string;
  decimal?: number;
  amount: string;
  name?: string;
  symbol?: string;
  iconUrl?: string;
}
export interface SwapEventPayloadDto extends BaseOnChainEventPayloadDto {
  toToken?: ValueTransferDto;
}

export interface BaseOnChainEventPayloadDto {
  chainId: number;
  txHash: string;
  fromToken: ValueTransferDto;
}

export interface BridgeEventPayloadDto extends BaseOnChainEventPayloadDto {
  destChainId: number;
  toToken: ValueTransferDto;
}

export interface CursorPaginatedResultsDto<T> {
  results: T[];
  cursor?: string;
  has_more: boolean;
  total_results?: number;
}

export interface AccountLifeTimeSpendDto {
  tier: string;
  pointsMultiplier: number;
}

export interface SeasonTierDto {
  id: string;
  type: string;
  pointsNeeded: number;
  seasonId: string;
}

export interface SeasonDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  tiers: SeasonTierDto[];
}

export interface SeasonStatusDto {
  seasonId: string;
  balance: number;
  currentTierId: string;
  updatedAt: string;
}

/**
 * State for the RewardsController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsControllerState = {
  // Auth state
  isAuthenticated: boolean;

  // Subscription state
  subscriptionId: string | null;

  // Season state
  currentSeasonId: string | null;
  seasonBalance: number;
  currentTierId: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
};

/**
 * Events that can be emitted by the RewardsController
 */
export interface RewardsControllerEvents {
  type: 'RewardsController:stateChange';
  payload: [RewardsControllerState, Patch[]];
}

/**
 * Patch type for state changes
 */
export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];
  value?: unknown;
}
