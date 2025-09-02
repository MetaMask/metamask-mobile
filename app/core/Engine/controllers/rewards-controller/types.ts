import { ControllerGetStateAction } from '@metamask/base-controller';
import { CaipAccountId } from '@metamask/utils';

export interface LoginResponseDto {
  sessionId: string;
  subscription: SubscriptionDto;
}

export interface SubscriptionDto {
  id: string;
  referralCode: string;
  [key: string]: string;
}

export interface EstimateAssetDto {
  /**
   * Asset identifier in CAIP-19 format
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  id: string;
  /**
   * Amount of the asset as a string
   * @example '25739959426'
   */
  amount: string;
  /**
   * Asset price in USD PER TOKEN. Using ETH as an example, 1 ETH = 4493.23 USD at the time of writing. If provided, this will be used instead of doing a network call to get the current price.
   * @example '4512.34'
   */
  usdPrice?: string;
}

export interface EstimateSwapContextDto {
  /**
   * Source asset information, in caip19 format
   * @example {
   *   id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
   *   amount: '25739959426'
   * }
   */
  srcAsset: EstimateAssetDto;

  /**
   * Destination asset information, in caip19 format.
   * @example {
   *   id: 'eip155:1/slip44:60',
   *   amount: '9912500000000000000'
   * }
   */
  destAsset: EstimateAssetDto;

  /**
   * Fee asset information, in caip19 format
   * @example {
   *   id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
   *   amount: '100'
   * }
   */
  feeAsset: EstimateAssetDto;
}

export interface EstimatePerpsContextDto {
  /**
   * Type of the PERPS action (open position, close position, stop/loss, take profit, ...)
   * @example 'OPEN_POSITION'
   */
  type: 'OPEN_POSITION' | 'CLOSE_POSITION' | 'STOP_LOSS' | 'TAKE_PROFIT';

  /**
   * USD fee value
   * @example '12.34'
   */
  usdFeeValue: string;

  /**
   * Asset symbol (e.g., "ETH", "BTC")
   * @example 'ETH'
   */
  coin: string;
}

export interface EstimatePointsContextDto {
  /**
   * Swap context data, must be present for SWAP activity
   */
  swapContext?: EstimateSwapContextDto;

  /**
   * PERPS context data, must be present for PERPS activity
   */
  perpsContext?: EstimatePerpsContextDto;
}

/**
 * Type of point earning activity. Swap is for swaps and bridges. PERPS is for perps activities.
 * @example 'SWAP'
 */
export type PointsEventEarnType = 'SWAP' | 'PERPS';

export interface EstimatePointsDto {
  /**
   * Type of point earning activity
   * @example 'SWAP'
   */
  activityType: PointsEventEarnType;

  /**
   * Account address performing the activity in CAIP-10 format
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  account: CaipAccountId;

  /**
   * Context data specific to the activity type
   */
  activityContext: EstimatePointsContextDto;
}

export interface EstimatedPointsDto {
  /**
   * Earnable for the activity
   * @example 100
   */
  pointsEstimate: number;

  /**
   * Bonus applied to the points estimate, in basis points. 100 = 1%
   * @example 200
   */
  bonusBips: number;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsSubscriptionState = {
  subscription: SubscriptionDto;
  // season status
  // referral details
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsAccountState = {
  account: CaipAccountId;
  hasOptedIn: boolean;
  subscriptionId: string | null;
  lastAuthTime: number;
  perpsFeeDiscount: number | null;
  lastPerpsDiscountRateFetched: number | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsControllerState = {
  lastAuthenticatedAccount: RewardsAccountState | null;
  accounts: { [account: CaipAccountId]: RewardsAccountState };
  subscriptions: { [subscriptionId: string]: RewardsSubscriptionState };
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

/**
 * Request for getting Perps discount
 */
export interface GetPerpsDiscountDto {
  /**
   * Account address in CAIP-10 format
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  account: CaipAccountId;
}

/**
 * Parsed response for Perps discount data
 */
export interface PerpsDiscountData {
  /**
   * Whether the account has opted in (0 = not opted in, 1 = opted in)
   */
  hasOptedIn: boolean;
  /**
   * The discount percentage as a number
   * @example 5.5
   */
  discount: number;
}

/**
 * Action for getting whether the account (caip-10 format) has opted in
 */
export interface RewardsControllerGetHasAccountOptedInAction {
  type: 'RewardsController:getHasAccountOptedIn';
  handler: (account: CaipAccountId) => Promise<boolean>;
}

/**
 * Action for estimating points for a given activity
 */
export interface RewardsControllerEstimatePointsAction {
  type: 'RewardsController:estimatePoints';
  handler: (request: EstimatePointsDto) => Promise<EstimatedPointsDto>;
}

/**
 * Action for getting perps fee discount for an account
 */
export interface RewardsControllerGetPerpsDiscountAction {
  type: 'RewardsController:getPerpsDiscountForAccount';
  handler: (account: CaipAccountId) => Promise<number>;
}

/**
 * Action for checking if rewards feature is enabled via feature flag
 */
export interface RewardsControllerIsRewardsFeatureEnabledAction {
  type: 'RewardsController:isRewardsFeatureEnabled';
  handler: () => boolean;
}

/**
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions =
  | ControllerGetStateAction<'RewardsController', RewardsControllerState>
  | RewardsControllerGetHasAccountOptedInAction
  | RewardsControllerEstimatePointsAction
  | RewardsControllerGetPerpsDiscountAction
  | RewardsControllerIsRewardsFeatureEnabledAction;
