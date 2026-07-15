// Payments V2 response — per-provider payment methods.
// debit-credit-card is listed first so it's auto-selected as the default
// (controller picks payments[0] when current selection is not in the new list).
export const RAMPS_PAYMENTS_V2_RESPONSE = {
  payments: [
    {
      id: '/payments/debit-credit-card',
      paymentType: 'debit-credit-card',
      name: 'Debit or Credit',
      score: 100,
      icons: [
        {
          type: 'materialIcons',
          name: 'card',
        },
      ],
      logo: {
        light: [
          'assets/Visa-regular@3x.png',
          'assets/Mastercard-regular@3x.png',
        ],
        dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
      },
      disclaimer:
        "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
      delay: [5, 10],
      pendingOrderDescription:
        'Card purchases may take a few minutes to complete.',
      amountTier: [1, 3],
      sellEnabled: true,
      sell: {
        enabled: true,
      },
      recurringBuy: {
        enabled: true,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/apple-pay',
      paymentType: 'apple-pay',
      name: 'Apple Pay',
      score: 95,
      icons: [
        {
          type: 'fontAwesome',
          name: 'apple',
        },
      ],
      logo: {
        light: [
          'assets/Visa-regular@3x.png',
          'assets/Mastercard-regular@3x.png',
        ],
        dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
      },
      disclaimer: 'Apple Cash is not supported.',
      delay: [0, 0],
      pendingOrderDescription:
        'Card purchases may take a few minutes to complete.',
      amountTier: [1, 3],
      isApplePay: true,
      sell: {
        enabled: false,
      },
      recurringBuy: {
        enabled: true,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/bank-transfer',
      paymentType: 'bank-transfer',
      name: 'Bank Transfer',
      score: 80,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: ['assets/SEPABankTransfer-regular@3x.png'],
        dark: ['assets/SEPABankTransfer@3x.png'],
      },
      delay: [1440, 2880],
      pendingOrderDescription:
        'Bank transfers may take 1-2 business days to complete.',
      amountTier: [2, 3],
      sellEnabled: true,
      sell: {
        enabled: true,
      },
      recurringBuy: {
        enabled: false,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/google-pay',
      paymentType: 'google-pay',
      name: 'Google Pay',
      score: 95,
      icons: [
        {
          type: 'fontAwesome',
          name: 'google',
        },
      ],
      logo: {
        light: [
          'assets/Visa-regular@3x.png',
          'assets/Mastercard-regular@3x.png',
        ],
        dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
      },
      delay: [0, 0],
      pendingOrderDescription:
        'Card purchases may take a few minutes to complete.',
      amountTier: [1, 3],
      sell: {
        enabled: false,
      },
      recurringBuy: {
        enabled: true,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/instant-ach',
      paymentType: 'instant-ach',
      name: 'Instant ACH',
      score: 85,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: ['assets/ACH-regular@3x.png'],
        dark: ['assets/ACH@3x.png'],
      },
      delay: [5, 15],
      pendingOrderDescription:
        'ACH transfers may take a few minutes to complete.',
      amountTier: [2, 3],
      sell: {
        enabled: false,
      },
      recurringBuy: {
        enabled: false,
      },
      buy: {
        enabled: true,
      },
    },
  ],
  sorted: [
    {
      sortBy: '1',
      ids: [
        '/payments/debit-credit-card',
        '/payments/apple-pay',
        '/payments/google-pay',
        '/payments/instant-ach',
        '/payments/bank-transfer',
      ],
    },
  ],
};
