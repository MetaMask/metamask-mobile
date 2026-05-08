/**
 * Card navigation parameters
 */

import type { CardFundingToken, CardSpendingSource } from './types';
import type { CardOnboardingCompletionIntent } from '../../../core/redux/slices/card';

/** Card spending limit screen parameters */
export interface CardSpendingLimitParams {
  flow?: 'manage' | 'enable' | 'onboarding';
  spendingSource?: CardSpendingSource;
  fixedSpendingSource?: boolean;
  selectedToken?: CardFundingToken;
  returnedSelectedToken?: CardFundingToken;
  returnedLimitType?: 'full' | 'restricted';
  returnedCustomLimit?: string;
}

export interface CardRouteIntentParams {
  completionIntent?: CardOnboardingCompletionIntent;
}

export interface CardAuthenticationParams extends CardRouteIntentParams {
  showAuthPrompt?: boolean;
}

/** Card confirm modal parameters */
export interface CardConfirmModalParams {
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
