import type { CardTokenAllowance, CardDetailsResponse } from '../../types';
import type { TokenI } from '../../../Tokens/types';

/**
 * Discriminated union representing the possible view states for CardHome.
 * This replaces scattered boolean states with a single source of truth.
 */
export type CardHomeViewState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; canRetry: boolean; isAuthError: boolean }
  | { status: 'kyc_pending' }
  | { status: 'setup_required'; canEnable: boolean; isProvisioning: boolean }
  | { status: 'ready'; features: CardHomeFeatures };

/**
 * Feature flags for the 'ready' state that control UI visibility and behavior.
 * This consolidates the many boolean computations from the original component.
 */
export interface CardHomeFeatures {
  // Authentication & login state
  isAuthenticated: boolean;
  isBaanxLoginEnabled: boolean;

  // Card details & actions
  canViewCardDetails: boolean;
  canManageSpendingLimit: boolean;
  canChangeAsset: boolean; // false for legacy cardholders (!isBaanxLoginEnabled)

  // Warnings & progress indicators
  showSpendingLimitWarning: boolean;
  showSpendingLimitProgress: boolean;
  showAllowanceLimitedWarning: boolean;

  // Swap capability
  isSwapEnabled: boolean;
}

/**
 * Asset balance information for displaying token balances.
 * Uses TokenI to match the type expected by CardAssetItem.
 */
export interface CardAssetBalance {
  asset?: TokenI;
  balanceFiat?: string;
  balanceFormatted?: string;
  rawFiatNumber?: number;
  rawTokenBalance?: number;
}

/**
 * Card details token state for viewing card number/CVV.
 */
export interface CardDetailsTokenState {
  isLoading: boolean;
  isImageLoading: boolean;
  imageUrl: string | null;
  onImageLoad: () => void;
  onImageError: () => void;
  fetchCardDetailsToken: () => Promise<void>;
  clearImageUrl: () => void;
}

/**
 * Complete state object returned by useCardHomeState hook.
 * This is the single source of truth for all CardHome UI decisions.
 */
export interface CardHomeState {
  // View state (determines which UI to show)
  viewState: CardHomeViewState;

  // Data for rendering
  priorityToken: CardTokenAllowance | null;
  cardDetails: CardDetailsResponse | null;
  assetBalance: CardAssetBalance | null;
  cardDetailsToken: CardDetailsTokenState;

  // Privacy
  privacyMode: boolean;
  togglePrivacyMode: (value: boolean) => void;

  // Actions
  fetchAllData: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  isRefreshing: boolean;

  // Navigation actions
  addFundsAction: () => void;
  changeAssetAction: () => void;
  manageSpendingLimitAction: () => void;
  viewCardDetailsAction: () => Promise<void>;
  navigateToCardPage: () => void;
  navigateToTravelPage: () => void;
  navigateToCardTosPage: () => void;
  logoutAction: () => void;
  openOnboardingDelegationAction: () => void;

  // Warning dismissal
  isSpendingLimitWarningDismissed: boolean;
  dismissSpendingLimitWarning: () => void;

  // Auth state (available even during loading for showing ToS/logout)
  isAuthenticated: boolean;
}
