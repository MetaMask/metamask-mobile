// Native Deposit SDK countries response for GET .../regions/countries?action=deposit.
// DepositRegion uses a boolean `supported` field.
export const RAMPS_DEPOSIT_COUNTRIES_RESPONSE = [
  {
    isoCode: 'PT',
    flag: '🇵🇹',
    name: 'Portugal',
    phone: { prefix: '+351', placeholder: '', template: '' },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phone: { prefix: '+33', placeholder: '', template: '' },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: { prefix: '+1', placeholder: '', template: '' },
    currency: 'USD',
    supported: true,
  },
  {
    isoCode: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    phone: { prefix: '+34', placeholder: '', template: '' },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'LC',
    flag: '🇱🇨',
    name: 'Saint Lucia',
    phone: { prefix: '+1-758', placeholder: '', template: '' },
    currency: 'XCD',
    supported: true,
  },
];
