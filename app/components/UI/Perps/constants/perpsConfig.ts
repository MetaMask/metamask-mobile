/**
 * Perps configuration constants - Mobile UI layer
 *
 * Controller-portable exports live in controllers/constants/perpsConfig.ts
 * and should be imported from '@metamask/perps-controller/constants/perpsConfig'.
 *
 * This file contains:
 * - UI-only configuration constants (layout, display, navigation)
 * - Mobile-specific exports (TokenI, @metamask/swaps-controller dependencies)
 */
import type { Hex } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';

/** Address used to represent "Perps balance" as the payment token (synthetic option). */
export const PERPS_BALANCE_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Hex;

/** Chain id used for the "Perps balance" payment option. */
export { ARBITRUM_CHAIN_ID as PERPS_BALANCE_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

/**
 * Minimum perps balance (USD) threshold for default pay token logic.
 * When available perps balance is above this, we do not preselect a pay token.
 * When below, we may preselect the allowlist token with highest balance.
 * Also used as the minimum token balance (USD) to consider for preselection.
 */
export const PERPS_MIN_BALANCE_THRESHOLD = 0.01;

/**
 * Minimum number of aggregators (exchanges) a token must be listed on
 * to be considered trustworthy for showing the Perps Discovery Banner.
 * Native tokens (ETH, BNB, etc.) bypass this check.
 */
export const PERPS_MIN_AGGREGATORS_FOR_TRUST = 2;

/**
 * Checks if an asset is trustworthy for displaying the Perps Discovery Banner.
 * An asset is considered trustworthy if:
 * - It is a native asset (ETH, BNB, SOL, etc.), OR
 * - It is listed on at least PERPS_MIN_AGGREGATORS_FOR_TRUST exchanges
 *
 * @param asset - Asset object (TokenI or partial TokenI)
 * @returns true if the asset is trustworthy, false otherwise
 */
export const isTokenTrustworthyForPerps = (asset: Partial<TokenI>): boolean => {
  const isNativeAsset = asset.isNative || asset.isETH;
  const hasEnoughAggregators =
    (asset.aggregators?.length ?? 0) >= PERPS_MIN_AGGREGATORS_FOR_TRUST;
  return isNativeAsset || hasEnoughAggregators;
};

// ─── UI-only configuration constants ───────────────────────────────────
// These are purely UI concerns (layout, display, navigation) with zero
// controller-layer consumers.

/**
 * Redesigned confirmations screen header configuration (Perps)
 * Controls whether the Perps header is shown when navigating to the confirmation screen
 */
export const CONFIRMATION_HEADER_CONFIG = {
  /** Default: show Perps header when opening confirmations from Perps flows */
  DefaultShowPerpsHeader: true,
  /** Hide Perps header when navigating from deposit-and-trade flow */
  ShowPerpsHeaderForDepositAndTrade: false,
} as const;

/**
 * Leverage slider UI configuration
 * Controls the visual and interactive aspects of the leverage slider
 */
export const LEVERAGE_SLIDER_CONFIG = {
  // Step sizes for tick marks based on max leverage
  TickStepLow: 5, // Step size when max leverage <= 20
  TickStepMedium: 10, // Step size when max leverage <= 50
  TickStepHigh: 20, // Step size when max leverage > 50

  // Thresholds for determining tick step size
  MaxLeverageLowThreshold: 20,
  MaxLeverageMediumThreshold: 50,
} as const;

/**
 * TP/SL View UI configuration
 * Controls the Take Profit / Stop Loss screen behavior and display options
 */
export const TP_SL_VIEW_CONFIG = {
  // Quick percentage button presets for Take Profit (positive RoE percentages)
  TakeProfitRoePresets: [10, 25, 50, 100], // +10%, +25%, +50%, +100% RoE

  // Quick percentage button presets for Stop Loss (negative RoE percentages)
  StopLossRoePresets: [-5, -10, -25, -50], // -5%, -10%, -25%, -50% RoE

  // WebSocket price update throttle delay (milliseconds)
  // Reduces re-renders by batching price updates in the TP/SL screen
  PriceThrottleMs: 1000,

  // Maximum number of digits allowed in price/percentage input fields
  // Prevents overflow and maintains reasonable input constraints
  MaxInputDigits: 9,

  // Keypad configuration for price inputs
  // USD_PERPS is not a real currency - it's a custom configuration
  // that allows 5 decimal places for crypto prices, overriding the
  // default USD configuration which only allows 2 decimal places
  KeypadCurrencyCode: 'USD_PERPS' as const,
  KeypadDecimals: 5,
} as const;

/**
 * Limit price configuration
 * Controls preset percentages and behavior for limit orders
 */
export const LIMIT_PRICE_CONFIG = {
  // Preset percentage options for quick selection
  PresetPercentages: [1, 2], // Available as both positive and negative

  // Modal opening delay when switching to limit order (milliseconds)
  // Allows order type modal to close smoothly before opening limit price modal
  ModalOpenDelay: 300,

  // Direction-specific preset configurations (Mid/Bid/Ask buttons handled separately)
  LongPresets: [-1, -2], // Buy below market for long orders
  ShortPresets: [1, 2], // Sell above market for short orders
} as const;

/**
 * Funding rate display configuration
 * Controls how funding rates are formatted and displayed across the app
 */
export const FUNDING_RATE_CONFIG = {
  // Number of decimal places to display for funding rates
  Decimals: 4,
  // Default display value when funding rate is zero or unavailable
  ZeroDisplay: '0.0000%',
  // Multiplier to convert decimal funding rate to percentage
  PercentageMultiplier: 100,
} as const;

export const PERPS_GTM_WHATS_NEW_MODAL = 'perps-gtm-whats-new-modal';
export const PERPS_GTM_MODAL_ENGAGE = 'engage';
export const PERPS_GTM_MODAL_DECLINE = 'decline';

/**
 * Development-only configuration for testing and debugging
 * These constants are only active when __DEV__ is true
 */
export const DEVELOPMENT_CONFIG = {
  // Magic number to simulate fee discount state (20% discount)
  SimulateFeeDiscountAmount: 41,

  // Magic number to simulate rewards error state (set order amount to this value)
  SimulateRewardsErrorAmount: 42,

  // Magic number to simulate rewards loading state
  SimulateRewardsLoadingAmount: 43,

  // Future: Add other development helpers as needed
} as const;

/**
 * Home screen configuration
 * Controls carousel limits and display settings for the main Perps home screen
 */
export const HOME_SCREEN_CONFIG = {
  // Show action buttons (Add Funds / Withdraw) in header instead of fixed footer
  // Can be controlled via feature flag in the future
  ShowHeaderActionButtons: true,

  // Maximum number of items to show in each carousel
  PositionsCarouselLimit: 10,
  OrdersCarouselLimit: 10,
  TrendingMarketsLimit: 5,
  RecentActivityLimit: 3,

  // Carousel display behavior
  CarouselSnapAlignment: 'start' as const,
  CarouselVisibleItems: 1.2, // Show 1 full item + 20% of next

  // Icon sizes for consistent display across sections
  DefaultIconSize: 40, // Default token icon size for cards and rows
} as const;

/**
 * Learn more card configuration
 * External resources and content for Perps education
 */
export const LEARN_MORE_CONFIG = {
  ExternalUrl: 'https://metamask.io/perps',
  TitleKey: 'perps.tutorial.card.title',
  DescriptionKey: 'perps.learn_more.description',
  CtaKey: 'perps.learn_more.cta',
} as const;

/**
 * Support configuration
 * Contact support button configuration (matches Settings behavior)
 */
export const SUPPORT_CONFIG = {
  Url: 'https://support.metamask.io',
  TitleKey: 'perps.support.title',
  DescriptionKey: 'perps.support.description',
} as const;

/**
 * Feedback survey configuration
 * External survey for collecting user feedback on Perps trading experience
 */
export const FEEDBACK_CONFIG = {
  Url: 'https://survey.alchemer.com/s3/8649911/MetaMask-Perps-Trading-Feedback',
  TitleKey: 'perps.feedback.title',
} as const;

/**
 * Support article URLs
 * Links to specific MetaMask support articles for Perps features
 */
export const PERPS_SUPPORT_ARTICLES_URLS = {
  AdlUrl:
    'https://support.metamask.io/manage-crypto/trade/perps/leverage-and-liquidation/#what-is-auto-deleveraging-adl',
} as const;

/**
 * Stop loss prompt banner configuration
 * Controls when and how the stop loss prompt banner is displayed
 * Based on TAT-1693 specifications
 */
export const STOP_LOSS_PROMPT_CONFIG = {
  // Distance to liquidation threshold (percentage)
  // Shows "Add margin" banner when position is within this % of liquidation
  LiquidationDistanceThreshold: 3,

  // ROE (Return on Equity) threshold (percentage)
  // Shows "Set stop loss" banner when ROE drops below this value
  RoeThreshold: -10,

  // Minimum loss threshold to show ANY banner (percentage)
  // No banner shown until ROE drops below this value
  MinLossThreshold: -10,

  // Debounce duration for ROE threshold (milliseconds)
  // User must have ROE below threshold for this duration before showing banner
  // Prevents banner from appearing during temporary price fluctuations
  RoeDebounceMs: 60_000, // 60 seconds

  // Minimum position age before showing any banner (milliseconds)
  // Prevents banner from appearing immediately after opening a position
  PositionMinAgeMs: 120_000, // 2 minutes

  // Suggested stop loss ROE percentage
  // When suggesting a stop loss, calculate price at this ROE from entry
  SuggestedStopLossRoe: -50,
} as const;

/**
 * Provider configuration
 * Controls which perpetual DEX providers are available
 *
 * Note: MYX provider enablement is now controlled via LaunchDarkly feature flag
 * (perpsMyxProviderEnabled) and MM_PERPS_MYX_PROVIDER_ENABLED environment variable.
 * See selectPerpsMYXProviderEnabledFlag selector for details.
 */
export const PROVIDER_CONFIG = {
  /** Default perpetual DEX provider when no explicit selection exists */
  DefaultProvider: 'hyperliquid' as const,
  /** Force MYX to testnet only (mainnet credentials not yet available) */
  MYX_TESTNET_ONLY: true,
} as const;
