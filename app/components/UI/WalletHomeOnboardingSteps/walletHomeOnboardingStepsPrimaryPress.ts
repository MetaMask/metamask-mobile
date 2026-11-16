import type { WalletHomeOnboardingStepKind } from './walletHomeOnboardingStepsModel';

export interface WalletHomeOnboardingPrimaryDeferDecision {
  shouldDeferAdvanceUntilReturn: boolean;
  fundOpensOnramp: boolean;
}

type FundPrimaryPress = (onLaunchFailure: () => void) => void;

/**
 * Trade / notifications / fund-with-onramp defer checklist advance until the user returns
 * from navigation. Fund-with-onramp requires its final completion marker before advancing.
 */
export function walletHomeOnboardingPrimaryDeferDecision(args: {
  hasTestOverrides: boolean;
  kind: WalletHomeOnboardingStepKind;
  onFundPrimaryPress?: FundPrimaryPress;
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
