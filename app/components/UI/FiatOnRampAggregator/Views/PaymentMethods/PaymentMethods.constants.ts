/* eslint-disable import/prefer-default-export */

import { Payment } from '@consensys/on-ramp-sdk';

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
      light: [
        'https://on-ramp.metafi-dev.codefi.network/assets/ACHBankTransfer-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.metafi-dev.codefi.network/assets/ACHBankTransfer@3x.png',
      ],
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
    logo: {
      light: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa-regular@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard@3x.png',
      ],
    },
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
    logo: {
      light: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa-regular@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard@3x.png',
      ],
    },
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
    delay: [5, 10],
    amountTier: [1, 3],
    translation: 'debit-credit-card',
  },
] as Partial<Payment>[];
