export const USDC_TOKEN = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  id: '/currencies/crypto/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  idv2: '/currencies/crypto/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  legacyId: '/currencies/crypto/1/usdc',
  logo: 'https://dev-static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  name: 'USDC',
  network: {
    active: true,
    chainId: '1',
    chainName: 'Ethereum Mainnet',
    shortName: 'Ethereum',
  },
  symbol: 'USDC',
};

export const DEBIT_CREDIT_PAYMENT_METHOD = {
  amountTier: [1, 3],
  delay: [5, 10],
  disclaimer:
    "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
  icons: [
    {
      name: 'card',
      type: 'materialIcons',
    },
  ],
  id: '/payments/debit-credit-card',
  logo: {
    dark: [
      'https://on-ramp-cache.api.cx.metamask.io/assets/Visa@3x.png',
      'https://on-ramp-cache.api.cx.metamask.io/assets/Mastercard@3x.png',
    ],
    light: [
      'https://on-ramp-cache.api.cx.metamask.io/assets/Visa-regular@3x.png',
      'https://on-ramp-cache.api.cx.metamask.io/assets/Mastercard-regular@3x.png',
    ],
  },
  name: 'Debit or Credit',
  paymentType: 'debit-credit-card',
  pendingOrderDescription: 'Card purchases may take a few minutes to complete.',
  score: 268,
  sellEnabled: true,
};
