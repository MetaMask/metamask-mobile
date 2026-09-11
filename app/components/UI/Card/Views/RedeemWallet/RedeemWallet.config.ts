import { CardMessageBoxType } from '../../types';
import { CardActions } from '../../util/metrics';
import {
  CASHBACK_MONEY_ACCOUNT_ORIGIN,
  CREDIT_MONEY_ACCOUNT_ORIGIN,
} from '../../hooks/useCardPostAuthRedirect';
import type { LinkFlowOrigin } from '../../hooks/useMoneyAccountCardLinkage';
import type { RedeemableWalletMode } from '../../hooks/useRedeemableWallet';
import { CashbackSelectors } from '../Cashback/Cashback.testIds';
import { CreditRedeemSelectors } from '../CreditRedeem/CreditRedeem.testIds';

interface RedeemTestIds {
  CONTAINER: string;
  BALANCE_TITLE: string;
  DETAILS_CARD: string;
  FUNDING_WARNING: string;
  WITHDRAW_BUTTON: string;
  TO_ROW: string;
  REFUND_INFO_BUTTON?: string;
}

interface RedeemModeConfig {
  testIds: RedeemTestIds;
  screenTitle?: string;
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
  withdrawToMoneyAccount?: string;
  fundingRequiredType: CardMessageBoxType;
  moneyAccountRequiredType: CardMessageBoxType;
  moneyAccountOrigin: LinkFlowOrigin;
  analyticsAction: CardActions;
  showRefundInfo: boolean;
  showFiatBalance: boolean;
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
    showRefundInfo: false,
    showFiatBalance: false,
  },
  credit: {
    testIds: CreditRedeemSelectors,
    screenTitle: 'card.credit_screen.title',
    strings: {
      available: 'card.credit_screen.available_credit',
      networkFee: 'card.credit_screen.network_fee',
      expectedToReceive: 'card.credit_screen.expected_to_receive',
      to: 'card.credit_screen.to',
      withdraw: 'card.credit_screen.withdraw',
      withdrawUnavailable: 'card.credit_screen.withdraw_unavailable',
      withdrawalSuccess: 'card.credit_screen.withdrawal_success',
      withdrawalFailed: 'card.credit_screen.withdrawal_failed',
      loadingError: 'card.credit_screen.loading_error',
    },
    withdrawToMoneyAccount: 'card.credit_screen.withdraw_to_money_account',
    fundingRequiredType: CardMessageBoxType.CreditFundingRequired,
    moneyAccountRequiredType: CardMessageBoxType.CreditMoneyAccountRequired,
    moneyAccountOrigin: CREDIT_MONEY_ACCOUNT_ORIGIN,
    analyticsAction: CardActions.CREDIT_BUTTON,
    showRefundInfo: true,
    showFiatBalance: true,
  },
};
