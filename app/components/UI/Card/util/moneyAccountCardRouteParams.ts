import type { CardSpendingLimitParams } from '../Card.types';
import type { CardOnboardingCompletionIntent } from '../../../../core/redux/slices/card';

export const MONEY_ACCOUNT_CARD_COMPLETION_INTENT: CardOnboardingCompletionIntent =
  'moneyAccountCardLinking';

export const MONEY_ACCOUNT_CARD_SPENDING_LIMIT_PARAMS: CardSpendingLimitParams =
  {
    flow: 'onboarding',
    spendingSource: 'primaryMoneyAccount',
    fixedSpendingSource: true,
  };
