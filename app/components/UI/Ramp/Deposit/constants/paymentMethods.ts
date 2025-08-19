import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon/index.ts';
import { brandColor } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../../util/theme/models.ts';

export interface DepositPaymentMethod {
  id: string;
  name: string;
  shortName?: string;
  duration: 'instant' | '1_to_2_days';
  icon: IconName;
  iconColor?:
    | string
    | IconColor
    | { [AppThemeKey.light]: string; [AppThemeKey.dark]: string };
}

export const DEBIT_CREDIT_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit Card',
  duration: 'instant',
  icon: IconName.Card,
};

export const SEPA_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'sepa_bank_transfer',
  name: 'SEPA Bank Transfer',
  shortName: 'SEPA',
  duration: '1_to_2_days',
  icon: IconName.Bank,
};

export const WIRE_TRANSFER_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'wire_transfer',
  name: 'Wire Transfer',
  shortName: 'Wire',
  duration: '1_to_2_days',
  icon: IconName.Bank,
};

export const APPLE_PAY_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'apple_pay',
  name: 'Apple Pay',
  duration: 'instant',
  icon: IconName.Apple,
  iconColor: {
    light: brandColor.black,
    dark: brandColor.white,
  },
};

export const ALL_PAYMENT_METHODS: DepositPaymentMethod[] = [
  DEBIT_CREDIT_PAYMENT_METHOD,
  SEPA_PAYMENT_METHOD,
  WIRE_TRANSFER_PAYMENT_METHOD,
  APPLE_PAY_PAYMENT_METHOD,
];

export const SUPPORTED_PAYMENT_METHODS: DepositPaymentMethod[] = [
  APPLE_PAY_PAYMENT_METHOD,
  DEBIT_CREDIT_PAYMENT_METHOD,
  SEPA_PAYMENT_METHOD,
  WIRE_TRANSFER_PAYMENT_METHOD,
];

export const MANUAL_BANK_TRANSFER_PAYMENT_METHODS: DepositPaymentMethod[] = [
  SEPA_PAYMENT_METHOD,
  WIRE_TRANSFER_PAYMENT_METHOD,
];
