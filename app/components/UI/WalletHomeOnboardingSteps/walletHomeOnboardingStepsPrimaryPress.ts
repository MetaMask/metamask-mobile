import type { WalletHomeOnboardingStepKind } from './walletHomeOnboardingStepsModel';

export interface WalletHomeOnboardingPrimaryDeferDecision {
  shouldDeferAdvanceUntilReturn: boolean;
  fundOpensOnramp: boolean;
}

/**
 * Trade / notifications / fund-with-onramp defer checklist advance until the user returns
 * from navigation (or until the fund balance gate passes for on-ramp).
 */
export function walletHomeOnboardingPrimaryDeferDecision(args: {
  hasTestOverrides: boolean;
  kind: WalletHomeOnboardingStepKind;
  onFundPrimaryPress?: () => void;
  onTradePrimaryPress?: () => void;
  onNotificationsPrimaryPress?: () => void;
}): WalletHomeOnboardingPrimaryDeferDecision {
  const {
    hasTestOverrides,
    kind,
    onFundPrimaryPress,
    onTradePrimaryPress,
    onNotificationsPrimaryPress,
  } = args;
  const fundOpensOnramp = kind === 'fund' && Boolean(onFundPrimaryPress);
  const shouldDeferAdvanceUntilReturn =
    !hasTestOverrides &&
    ((kind === 'trade' && Boolean(onTradePrimaryPress)) ||
      (kind === 'notifications' && Boolean(onNotificationsPrimaryPress)) ||
      fundOpensOnramp);
  return { shouldDeferAdvanceUntilReturn, fundOpensOnramp };
}
