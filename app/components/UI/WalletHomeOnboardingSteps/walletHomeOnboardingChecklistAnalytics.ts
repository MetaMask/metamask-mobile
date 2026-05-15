import type { WalletHomeOnboardingStepKind } from './walletHomeOnboardingStepsModel';

/** `HOME_VIEWED.interaction_type` when the wallet home onboarding checklist is shown. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE =
  'onboarding_checklist' as const;

/**
 * `HOME_VIEWED.section_name` per checklist step (Segment / analytics).
 * @see https://consensyssoftware.atlassian.net/browse/TMCU-680
 */
export const WalletHomeOnboardingChecklistSectionName = {
  ON_RAMP: 'on_ramp',
  FIRST_TRADE: 'first_trade',
  NOTIFICATIONS: 'notifications',
} as const;

export type WalletHomeOnboardingChecklistSectionNameKey =
  (typeof WalletHomeOnboardingChecklistSectionName)[keyof typeof WalletHomeOnboardingChecklistSectionName];

/**
 * Maps checklist step kind to `section_name` on {@link MetaMetricsEvents.HOME_VIEWED}.
 */
export function walletHomeOnboardingStepKindToHomeViewedSectionName(
  kind: WalletHomeOnboardingStepKind,
): WalletHomeOnboardingChecklistSectionNameKey {
  switch (kind) {
    case 'fund':
      return WalletHomeOnboardingChecklistSectionName.ON_RAMP;
    case 'trade':
      return WalletHomeOnboardingChecklistSectionName.FIRST_TRADE;
    case 'notifications':
      return WalletHomeOnboardingChecklistSectionName.NOTIFICATIONS;
  }
}
