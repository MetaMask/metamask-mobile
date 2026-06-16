import { strings } from '../../../../locales/i18n';
import type { WalletHomeOnboardingStepKind } from './walletHomeOnboardingStepsModel';

export function walletHomeOnboardingTitleForStep(
  kind: WalletHomeOnboardingStepKind,
): string {
  switch (kind) {
    case 'fund':
      return strings('wallet.home_onboarding_steps.fund_title');
    case 'trade':
      return strings('wallet.home_onboarding_steps.trade_title');
    case 'notifications':
      return strings('wallet.home_onboarding_steps.notifications_title');
  }
}

export function walletHomeOnboardingSubtitleForStep(
  kind: WalletHomeOnboardingStepKind,
): string {
  switch (kind) {
    case 'fund':
      return strings('wallet.home_onboarding_steps.fund_subtitle');
    case 'trade':
      return strings('wallet.home_onboarding_steps.trade_subtitle');
    case 'notifications':
      return strings('wallet.home_onboarding_steps.notifications_subtitle');
  }
}

export function walletHomeOnboardingPrimaryLabelForStep(
  kind: WalletHomeOnboardingStepKind,
): string {
  switch (kind) {
    case 'fund':
      return strings('wallet.home_onboarding_steps.fund_primary');
    case 'trade':
      return strings('wallet.home_onboarding_steps.trade_primary');
    case 'notifications':
      return strings('wallet.home_onboarding_steps.notifications_primary');
  }
}
