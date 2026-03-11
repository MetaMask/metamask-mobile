/**
 * Payments override for Transak native flow (bank transfer path).
 * Adds isManualBankTransfer: true to debit-credit-card so the flow
 * avoids the unmockable WebView and uses the bank transfer path.
 * Overrides: GET on-ramp-cache.../v2/regions/.../payments
 */

export const TRANSAK_PAYMENTS_OVERRIDE_RESPONSE = {
  payments: [
    {
      id: '/payments/debit-credit-card',
      paymentType: 'debit-credit-card',
      name: 'Debit or Credit',
      score: 100,
      icons: [{ type: 'materialIcons', name: 'card' }],
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
      isManualBankTransfer: true,
      sellEnabled: true,
      sell: { enabled: true },
      recurringBuy: { enabled: true },
      buy: { enabled: true },
    },
  ],
  sorted: [
    {
      sortBy: '1',
      ids: ['/payments/debit-credit-card'],
    },
  ],
};
