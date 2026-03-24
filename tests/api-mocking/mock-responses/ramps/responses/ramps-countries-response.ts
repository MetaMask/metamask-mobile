// Countries response — used by both V1 and V2 endpoints.
// Must include `currencies` array (SDK's getDefaultFiatCurrencySync iterates it)
// and `support` object (not `supported` — the aggregator SDK checks `support.buy/sell`).
export const RAMPS_COUNTRIES_RESPONSE = [
  {
    isoCode: 'PT',
    id: '/regions/pt',
    emoji: '🇵🇹',
    name: 'Portugal',
    phone: { prefix: '+351', placeholder: '', template: '' },
    currency: 'EUR',
    currencies: ['/currencies/fiat/eur'],
    support: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'FR',
    id: '/regions/fr',
    emoji: '🇫🇷',
    name: 'France',
    phone: { prefix: '+33', placeholder: '', template: '' },
    currency: 'EUR',
    currencies: ['/currencies/fiat/eur'],
    support: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'US',
    id: '/regions/us',
    emoji: '🇺🇸',
    name: 'United States of America',
    phone: { prefix: '+1', placeholder: '', template: '' },
    currency: 'USD',
    currencies: ['/currencies/fiat/usd'],
    states: [
      {
        id: '/regions/us-ca',
        name: 'California',
        stateId: 'ca',
        support: {
          buy: true,
          sell: true,
        },
      },
    ],
    support: {
      buy: false,
      sell: false,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'ES',
    id: '/regions/es',
    emoji: '🇪🇸',
    name: 'Spain',
    phone: { prefix: '+34', placeholder: '', template: '' },
    currency: 'EUR',
    currencies: ['/currencies/fiat/eur'],
    support: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
];
