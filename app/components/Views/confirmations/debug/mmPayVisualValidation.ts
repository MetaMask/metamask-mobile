/**
 * __DEV__-only visual QA store for MetaMask Pay amount confirmations
 * (Perps/Predict/Money/mUSD deposit & withdraw flows that share CustomAmountInfo).
 *
 * Default selected state is always `live` (no overrides).
 * Presets force error / empty states and set `forceNavbarTitle` to match the
 * real page title for that flow (e.g. withdraw → "Withdraw").
 */

import { useSyncExternalStore } from 'react';
import { strings } from '../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../UI/Earn/constants/musd';

export type MMPayVisualPage =
  | 'perps_deposit'
  | 'perps_withdraw'
  | 'predict_deposit'
  | 'predict_withdraw'
  | 'money_deposit'
  | 'money_withdraw'
  | 'musd_conversion';

export type MMPayVisualStateId =
  | 'live'
  // Shared
  | 'error_no_quotes'
  | 'error_hardware_wallet'
  | 'error_pending_deposit'
  | 'error_pending_pay_token'
  | 'error_headless_buy'
  | 'error_fiat_amount_limit'
  | 'error_deposit_limit'
  | 'error_insufficient_token'
  | 'error_insufficient_fees'
  | 'error_insufficient_native'
  // Perps
  | 'error_perps_minimum'
  | 'error_perps_buy_empty'
  | 'error_perps_withdraw_balance'
  // Predict
  | 'error_predict_buy_empty'
  | 'error_predict_withdraw_balance'
  // Money
  | 'error_money_account_no_funds'
  | 'error_money_withdraw_balance'
  // mUSD
  | 'error_musd_insufficient';

export type MMPayPayWithVariant =
  | 'token'
  | 'fiat'
  | 'money'
  | 'empty'
  | 'skeleton'
  | 'hidden';

export interface MMPayVisualOverrides {
  forceNavbarTitle?: string;
  forceKeyboardVisible?: boolean;
  forceAmountFiat?: string;
  forceAmountLoading?: boolean;
  forceHasInput?: boolean;
  forceHasMax?: boolean;
  forceHidePercentageButtons?: boolean;
  forceHasPaymentOption?: boolean;
  forceHasAccountNoFunds?: boolean;
  forceQuotesLoading?: boolean;
  forceHasQuotes?: boolean;
  forceHasSourceAmount?: boolean;
  forceAlertMessage?: string;
  forceAlertTitle?: string;
  /** Fully formatted HelpText under the amount (takes precedence). */
  forceHelpText?: string;
  forcePaidByMetaMask?: boolean;
  forcePayWithVariant?: MMPayPayWithVariant;
  forcePayWithLabel?: 'pay_with' | 'receive_as';
  forcePayWithSymbol?: string;
  forcePayWithBalance?: string;
  forceFeeUsd?: string;
  forceBridgeTime?: string;
  forceHideBridgeTime?: boolean;
  forceTotalUsd?: string;
  forceCanSelectWithdrawToken?: boolean;
  forceShowPercentageRow?: boolean;
  forceConfirmDisabled?: boolean;
  forceConfirmLoading?: boolean;
  /** Hide Confirm so Buy crypto is the only primary CTA. */
  forceHideConfirm?: boolean;
  forceBuySection?: boolean;
  forceHideBuy?: boolean;
  forceAwaitingPrefill?: boolean;
  forceBuyMessageFlow?: 'perps' | 'predict' | 'none';
  forceHeadlessBuyError?: string;
}

export interface MMPayVisualPreset {
  id: MMPayVisualStateId;
  label: string;
  group: string;
  description?: string;
}

/** Real navbar titles for each CustomAmountInfo host page. */
export function getMMPayPageTitle(page: MMPayVisualPage): string {
  switch (page) {
    case 'perps_deposit':
      return strings('confirm.title.perps_deposit');
    case 'perps_withdraw':
      return strings('confirm.title.perps_withdraw');
    case 'predict_deposit':
      return strings('confirm.title.predict_deposit');
    case 'predict_withdraw':
      return strings('confirm.title.predict_withdraw');
    case 'money_deposit':
      return strings('confirm.title.money_account_add_money');
    case 'money_withdraw':
      return strings('confirm.title.money_account_send');
    case 'musd_conversion':
      return strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
        percentage: MUSD_CONVERSION_APY,
      });
    default:
      return strings('confirm.title.perps_deposit');
  }
}

const RESULT_BASE: MMPayVisualOverrides = {
  forceKeyboardVisible: false,
  forceAmountFiat: '25.00',
  forceHasPaymentOption: true,
  forceHasAccountNoFunds: false,
  forceHasQuotes: true,
  forceHasSourceAmount: true,
  forceQuotesLoading: false,
  forceAwaitingPrefill: false,
  forceHideBuy: true,
};

function withPage(
  page: MMPayVisualPage,
  overrides: MMPayVisualOverrides,
): MMPayVisualOverrides {
  return {
    ...overrides,
    forceNavbarTitle: getMMPayPageTitle(page),
  };
}

export const MM_PAY_VISUAL_PRESETS: MMPayVisualPreset[] = [
  {
    id: 'live',
    label: 'Live (no override)',
    group: 'Control',
    description: 'Clear all forced UI; use real controller data',
  },
  {
    id: 'error_insufficient_token',
    label: 'Insufficient token balance',
    group: 'Shared errors',
    description: 'Amount exceeds pay-token balance (blocking)',
  },
  {
    id: 'error_insufficient_fees',
    label: 'Insufficient for fees / method',
    group: 'Shared errors',
    description: 'Balance covers amount but not fees',
  },
  {
    id: 'error_insufficient_native',
    label: 'Insufficient native for gas',
    group: 'Shared errors',
    description: 'Not enough native ticker for source fees',
  },
  {
    id: 'error_no_quotes',
    label: 'No quotes / route unavailable',
    group: 'Shared errors',
    description: 'Payment route unavailable; hides fee rows',
  },
  {
    id: 'error_hardware_wallet',
    label: 'Hardware wallet not supported',
    group: 'Shared errors',
    description: 'MM Pay hardware account blocking alert',
  },
  {
    id: 'error_pending_deposit',
    label: 'Deposit already in progress',
    group: 'Shared errors',
    description: 'Signed/submitted deposit still pending',
  },
  {
    id: 'error_pending_pay_token',
    label: 'Pending tx on pay network',
    group: 'Shared errors',
    description: 'Pending transaction on payment token chain',
  },
  {
    id: 'error_headless_buy',
    label: 'Fiat purchase failed',
    group: 'Shared errors',
    description: 'Headless buy error banner',
  },
  {
    id: 'error_fiat_amount_limit',
    label: 'Fiat amount out of range',
    group: 'Shared errors',
    description: 'Ramp buy limits violated',
  },
  {
    id: 'error_deposit_limit',
    label: 'Max deposit limit',
    group: 'Shared errors',
    description: 'Amount exceeds remote deposit limit',
  },
  {
    id: 'error_perps_minimum',
    label: 'Perps — minimum $10',
    group: 'Perps',
    description: 'Title: Add funds · minimum deposit alert',
  },
  {
    id: 'error_perps_buy_empty',
    label: 'Perps — no funds / Buy crypto',
    group: 'Perps',
    description: 'Title: Add funds · buy empty state',
  },
  {
    id: 'error_perps_withdraw_balance',
    label: 'Perps — withdraw insufficient',
    group: 'Perps',
    description: 'Title switches to Withdraw',
  },
  {
    id: 'error_predict_buy_empty',
    label: 'Predict — no funds / Buy crypto',
    group: 'Predict',
    description: 'Title: Add Prediction funds',
  },
  {
    id: 'error_predict_withdraw_balance',
    label: 'Predict — withdraw insufficient',
    group: 'Predict',
    description: 'Title switches to Withdraw',
  },
  {
    id: 'error_money_account_no_funds',
    label: 'Money — account no funds',
    group: 'Money',
    description: 'Title: Add funds · no funds available',
  },
  {
    id: 'error_money_withdraw_balance',
    label: 'Money — send insufficient',
    group: 'Money',
    description: 'Title switches to Send · HelpText: Insufficient funds',
  },
  {
    id: 'error_musd_insufficient',
    label: 'mUSD — insufficient funds',
    group: 'mUSD',
    description: 'Title: Convert and get N%',
  },
];

export function getOverridesForState(
  id: MMPayVisualStateId,
): MMPayVisualOverrides | null {
  switch (id) {
    case 'live':
      return null;

    case 'error_insufficient_token': {
      const cta = strings(
        'alert_system.insufficient_pay_token_balance.message',
      );
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forceAmountFiat: '100.00',
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$12.00',
        forceFeeUsd: '$0.17',
        forceBridgeTime: '< 1 min',
        forceTotalUsd: '$100.17',
        forceAlertTitle: cta,
        forceAlertMessage: undefined,
        forceHelpText: cta,
        forceConfirmDisabled: true,
      });
    }

    case 'error_insufficient_fees': {
      const cta = strings(
        'alert_system.insufficient_pay_token_balance.message',
      );
      const error = strings(
        'alert_system.insufficient_pay_method_balance.message',
      );
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$25.00',
        forceFeeUsd: '$0.50',
        forceBridgeTime: '< 1 min',
        forceTotalUsd: '$25.50',
        forceAlertTitle: cta,
        forceAlertMessage: error,
        forceHelpText: `${cta} - ${error}`,
        forceConfirmDisabled: true,
      });
    }

    case 'error_insufficient_native': {
      const error = strings(
        'alert_system.insufficient_pay_token_native.message',
        { ticker: 'ETH' },
      );
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$50.00',
        forceFeeUsd: '$0.17',
        forceBridgeTime: '< 1 min',
        forceTotalUsd: '$25.17',
        forceAlertTitle: strings(
          'alert_system.insufficient_pay_token_balance.message',
        ),
        forceAlertMessage: error,
        forceHelpText: error,
        forceConfirmDisabled: true,
      });
    }

    case 'error_no_quotes': {
      const error = strings('alert_system.no_pay_token_quotes.message');
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forceHasQuotes: false,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$50.00',
        forceAlertTitle: strings('alert_system.no_pay_token_quotes.title'),
        forceAlertMessage: error,
        forceHelpText: error,
        forceConfirmDisabled: true,
      });
    }

    case 'error_hardware_wallet': {
      const error = strings('alert_system.mmpay_hardware_account.message');
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$50.00',
        forceFeeUsd: '$0.17',
        forceBridgeTime: '< 1 min',
        forceTotalUsd: '$25.17',
        forceAlertTitle: strings('alert_system.mmpay_hardware_account.title'),
        forceAlertMessage: error,
        forceHelpText: error,
        forceConfirmDisabled: true,
      });
    }

    case 'error_pending_deposit': {
      const cta = strings(
        'alert_system.signed_or_submitted_perps_deposit.title',
      );
      const error = strings(
        'alert_system.signed_or_submitted_perps_deposit.message',
      );
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$50.00',
        forceFeeUsd: '$0.17',
        forceBridgeTime: '< 1 min',
        forceTotalUsd: '$25.17',
        forceAlertTitle: cta,
        forceAlertMessage: error,
        forceHelpText: `${cta} - ${error}`,
        forceConfirmDisabled: true,
      });
    }

    case 'error_pending_pay_token': {
      const error = strings(
        'alert_system.signed_or_submitted_pay_token.message',
      );
      return withPage('perps_deposit', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$50.00',
        forceFeeUsd: '$0.17',
        forceBridgeTime: '< 1 min',
        forceTotalUsd: '$25.17',
        forceAlertTitle: strings(
          'alert_system.signed_or_submitted_pay_token.title',
        ),
        forceAlertMessage: error,
        forceHelpText: error,
        forceConfirmDisabled: true,
      });
    }

    case 'error_headless_buy': {
      const cta = strings('alert_system.headless_buy_error.title');
      const error = 'Payment provider unavailable';
      return withPage('money_deposit', {
        ...RESULT_BASE,
        forcePayWithVariant: 'fiat',
        forcePayWithSymbol: 'Debit or Credit',
        forceHideBridgeTime: true,
        forceFeeUsd: '$0.00',
        forceTotalUsd: '$25.00',
        forceHeadlessBuyError: error,
        forceAlertTitle: cta,
        forceAlertMessage: error,
        forceHelpText: `${cta} - ${error}`,
        forceConfirmDisabled: true,
      });
    }

    case 'error_fiat_amount_limit': {
      const error = 'Minimum amount is $10.00';
      return withPage('money_deposit', {
        forceKeyboardVisible: true,
        forceAmountFiat: '5',
        forceHasInput: true,
        forceHidePercentageButtons: true,
        forceHasPaymentOption: true,
        forcePayWithVariant: 'fiat',
        forcePayWithSymbol: 'Debit or Credit',
        forceAlertTitle: strings('alert_system.fiat_buy_amount_limit.title'),
        forceAlertMessage: error,
        forceHelpText: error,
        forceConfirmDisabled: true,
      });
    }

    case 'error_deposit_limit': {
      const cta = strings('alert_system.deposit_limit.title', {
        amount: '$10,000',
      });
      return withPage('perps_deposit', {
        forceKeyboardVisible: true,
        forceAmountFiat: '100000',
        forceHasInput: true,
        forceHasPaymentOption: true,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$250.00',
        forceAlertTitle: cta,
        forceHelpText: cta,
        forceConfirmDisabled: true,
      });
    }

    case 'error_perps_minimum': {
      const cta = strings('alert_system.perps_deposit_minimum.message');
      return withPage('perps_deposit', {
        forceKeyboardVisible: true,
        forceAmountFiat: '5',
        forceHasInput: true,
        forceHasPaymentOption: true,
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$50.00',
        forceAlertTitle: cta,
        forceHelpText: cta,
        forceConfirmDisabled: true,
      });
    }

    case 'error_perps_buy_empty': {
      const error = strings('confirm.custom_amount.buy_perps');
      return withPage('perps_deposit', {
        forceKeyboardVisible: false,
        forceAmountFiat: '0',
        forceHasPaymentOption: false,
        forceHasAccountNoFunds: true,
        forceBuySection: true,
        forceBuyMessageFlow: 'perps',
        forcePayWithVariant: 'hidden',
        forceHelpText: error,
        forceHideConfirm: true,
      });
    }

    case 'error_perps_withdraw_balance': {
      const cta = strings(
        'alert_system.insufficient_pay_token_balance.message',
      );
      const error = strings(
        'alert_system.insufficient_pay_method_balance.message',
      );
      return withPage('perps_withdraw', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithLabel: 'receive_as',
        forcePayWithSymbol: 'USDC',
        forceCanSelectWithdrawToken: true,
        forceFeeUsd: '$0.12',
        forceBridgeTime: '< 1 min',
        forceAlertTitle: cta,
        forceAlertMessage: error,
        forceHelpText: `${cta} - ${error}`,
        forceConfirmDisabled: true,
      });
    }

    case 'error_predict_buy_empty': {
      const error = strings('confirm.custom_amount.buy_predict');
      return withPage('predict_deposit', {
        forceKeyboardVisible: false,
        forceAmountFiat: '0',
        forceHasPaymentOption: false,
        forceHasAccountNoFunds: true,
        forceBuySection: true,
        forceBuyMessageFlow: 'predict',
        forcePayWithVariant: 'hidden',
        forceHelpText: error,
        forceHideConfirm: true,
      });
    }

    case 'error_predict_withdraw_balance': {
      const cta = strings(
        'alert_system.insufficient_pay_token_balance.message',
      );
      const error = strings(
        'alert_system.insufficient_pay_method_balance.message',
      );
      return withPage('predict_withdraw', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithLabel: 'receive_as',
        forcePayWithSymbol: 'USDC',
        forceCanSelectWithdrawToken: true,
        forceFeeUsd: '$0.12',
        forceBridgeTime: '< 1 min',
        forceAlertTitle: cta,
        forceAlertMessage: error,
        forceHelpText: `${cta} - ${error}`,
        forceConfirmDisabled: true,
      });
    }

    case 'error_money_account_no_funds': {
      const error = strings('alert_system.account_no_funds.message');
      return withPage('money_deposit', {
        forceKeyboardVisible: true,
        forceAmountFiat: '0',
        forceHasPaymentOption: false,
        forceHasAccountNoFunds: true,
        forcePayWithVariant: 'hidden',
        forceHideBuy: true,
        forceAlertTitle: strings('alert_system.account_no_funds.title'),
        forceAlertMessage: error,
        forceHelpText: error,
        forceConfirmDisabled: true,
      });
    }

    case 'error_money_withdraw_balance': {
      const cta = strings(
        'alert_system.insufficient_pay_token_balance.message',
      );
      return withPage('money_withdraw', {
        ...RESULT_BASE,
        forcePayWithVariant: 'token',
        forcePayWithLabel: 'receive_as',
        forcePayWithSymbol: 'USDC',
        forceCanSelectWithdrawToken: true,
        forceFeeUsd: '$0.12',
        forceBridgeTime: '< 1 min',
        forceAlertTitle: cta,
        forceHelpText: cta,
        forceConfirmDisabled: true,
      });
    }

    case 'error_musd_insufficient': {
      const cta = strings(
        'alert_system.insufficient_pay_token_balance.message',
      );
      return withPage('musd_conversion', {
        ...RESULT_BASE,
        forceAmountFiat: '100',
        forcePayWithVariant: 'token',
        forcePayWithSymbol: 'USDC',
        forcePayWithBalance: '$5.00',
        forcePaidByMetaMask: true,
        forceHideBridgeTime: true,
        forceShowPercentageRow: true,
        forceAlertTitle: cta,
        forceHelpText: cta,
        forceConfirmDisabled: true,
      });
    }

    default:
      return null;
  }
}

type Listener = () => void;

let selectedStateId: MMPayVisualStateId = 'live';
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getMMPayVisualStateId(): MMPayVisualStateId {
  return selectedStateId;
}

export function setMMPayVisualStateId(id: MMPayVisualStateId): void {
  if (!__DEV__) {
    return;
  }
  if (selectedStateId === id) {
    return;
  }
  selectedStateId = id;
  emit();
}

export function subscribeMMPayVisualState(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMMPayVisualOverrides(): MMPayVisualOverrides | null {
  const id = useSyncExternalStore(
    subscribeMMPayVisualState,
    getMMPayVisualStateId,
    getMMPayVisualStateId,
  );
  if (!__DEV__) {
    return null;
  }
  return getOverridesForState(id);
}

export function getMMPayVisualPresetGroups(): {
  group: string;
  presets: MMPayVisualPreset[];
}[] {
  const groups: { group: string; presets: MMPayVisualPreset[] }[] = [];
  for (const preset of MM_PAY_VISUAL_PRESETS) {
    const existing = groups.find((g) => g.group === preset.group);
    if (existing) {
      existing.presets.push(preset);
    } else {
      groups.push({ group: preset.group, presets: [preset] });
    }
  }
  return groups;
}
