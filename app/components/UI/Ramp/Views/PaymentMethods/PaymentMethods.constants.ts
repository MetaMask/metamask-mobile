/* eslint-disable import/prefer-default-export */

import { Payment } from '@consensys/on-ramp-sdk';
import APP_CONSTANTS from '../../../../../core/AppConstants';
const {
  MASTERCARD_LIGHT,
  MASTERCARD_DARK,
  VISA_LIGHT,
  VISA_DARK,
  ACH_LIGHT,
  ACH_DARK,
} = APP_CONSTANTS.URLS.ICONS;

const CREDIT_CARD_LOGOS = {
  light: [VISA_LIGHT, MASTERCARD_LIGHT],
  dark: [VISA_DARK, MASTERCARD_DARK],
};

export const mockPaymentMethods = [
  {
    id: '/payments/instant-bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Instant Bank Transfer',
    score: 5,
    icons: [
      {
        type: 'materialCommunityIcons',
        name: 'bank',
      },
    ],
    logo: {
      light: [ACH_LIGHT],
      dark: [ACH_DARK],
    },
    delay: [0, 0],
    amountTier: [3, 3],
    supportedCurrency: ['/currencies/fiat/usd'],
    translation: 'ACH',
  },
  {
    id: '/payments/apple-pay',
    paymentType: 'apple-pay',
    name: 'Apple Pay',
    score: 6,
    icons: [
      {
        type: 'fontAwesome',
        name: 'apple',
      },
    ],
    logo: CREDIT_CARD_LOGOS,
    disclaimer: 'Apple Cash is not supported.',
    delay: [0, 0],
    amountTier: [1, 3],
    isApplePay: true,
    translation: 'mobile_wallet',
  },
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 8,
    icons: [
      {
        type: 'materialIcons',
        name: 'card',
      },
    ],
    logo: CREDIT_CARD_LOGOS,
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
    delay: [5, 10],
    amountTier: [1, 3],
    translation: 'debit-credit-card',
  },
] as Partial<Payment>[];
