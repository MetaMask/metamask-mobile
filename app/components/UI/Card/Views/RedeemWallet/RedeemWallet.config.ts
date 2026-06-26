import { CardMessageBoxType } from '../../types';
import { CardActions } from '../../util/metrics';
import { CASHBACK_MONEY_ACCOUNT_ORIGIN } from '../../hooks/useCardPostAuthRedirect';
import type { LinkFlowOrigin } from '../../hooks/useMoneyAccountCardLinkage';
import type { RedeemableWalletMode } from '../../hooks/useRedeemableWallet';
import { CashbackSelectors } from '../Cashback/Cashback.testIds';

interface RedeemTestIds {
  CONTAINER: string;
  BALANCE_TITLE: string;
  DETAILS_CARD: string;
  FUNDING_WARNING: string;
  WITHDRAW_BUTTON: string;
  TO_ROW: string;
}

interface RedeemModeConfig {
  testIds: RedeemTestIds;
  strings: {
    available: string;
    networkFee: string;
    expectedToReceive: string;
    to: string;
    withdraw: string;
    withdrawUnavailable: string;
    withdrawalSuccess: string;
    withdrawalFailed: string;
    loadingError: string;
  };
  fundingRequiredType: CardMessageBoxType;
  moneyAccountRequiredType: CardMessageBoxType;
  moneyAccountOrigin: LinkFlowOrigin;
  analyticsAction: CardActions;
}

export const REDEEM_CONFIG: Record<RedeemableWalletMode, RedeemModeConfig> = {
  cashback: {
    testIds: CashbackSelectors,
    strings: {
      available: 'card.cashback_screen.available_cashback',
      networkFee: 'card.cashback_screen.network_fee',
      expectedToReceive: 'card.cashback_screen.expected_to_receive',
      to: 'card.cashback_screen.to',
      withdraw: 'card.cashback_screen.withdraw',
      withdrawUnavailable: 'card.cashback_screen.withdraw_unavailable',
      withdrawalSuccess: 'card.cashback_screen.withdrawal_success',
      withdrawalFailed: 'card.cashback_screen.withdrawal_failed',
      loadingError: 'card.cashback_screen.loading_error',
    },
    fundingRequiredType: CardMessageBoxType.CashbackFundingRequired,
    moneyAccountRequiredType: CardMessageBoxType.CashbackMoneyAccountRequired,
    moneyAccountOrigin: CASHBACK_MONEY_ACCOUNT_ORIGIN,
    analyticsAction: CardActions.CASHBACK_BUTTON,
  },
};
