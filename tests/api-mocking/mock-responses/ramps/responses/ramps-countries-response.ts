import type { RampsCountriesV2Response } from '../../../api-response-types';

// Controller countries response for GET .../v2/regions/countries.
// Must include `supported` on countries because
// @metamask/ramps-controller RampsService.getCountries() filters on
// `country.supported.buy || country.supported.sell`.
// Legacy aggregator and native deposit use separate response files.
export const RAMPS_COUNTRIES_RESPONSE = [
  {
    isoCode: 'PT',
    id: '/regions/pt',
    flag: '🇵🇹',
    name: 'Portugal',
    phone: { prefix: '+351', placeholder: '', template: '' },
    currency: 'EUR',
    supported: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'FR',
    id: '/regions/fr',
    flag: '🇫🇷',
    name: 'France',
    phone: { prefix: '+33', placeholder: '', template: '' },
    currency: 'EUR',
    supported: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'US',
    id: '/regions/us',
    flag: '🇺🇸',
    name: 'United States of America',
    phone: { prefix: '+1', placeholder: '', template: '' },
    currency: 'USD',
    states: [
      {
        id: '/regions/us-ca',
        name: 'California',
        stateId: 'ca',
        supported: {
          buy: true,
          sell: true,
        },
      },
    ],
    supported: {
      buy: false,
      sell: false,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'ES',
    id: '/regions/es',
    flag: '🇪🇸',
    name: 'Spain',
    phone: { prefix: '+34', placeholder: '', template: '' },
    currency: 'EUR',
    supported: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  {
    isoCode: 'LC',
    id: '/regions/lc',
    flag: '🇱🇨',
    name: 'Saint Lucia',
    phone: { prefix: '+1-758', placeholder: '', template: '' },
    currency: 'XCD',
    supported: {
      buy: true,
      sell: true,
    },
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
] satisfies RampsCountriesV2Response;
