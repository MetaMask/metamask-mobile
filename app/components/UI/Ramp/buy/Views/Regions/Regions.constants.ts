import { Country } from '@consensys/on-ramp-sdk';

export const mockRegionsData = [
  {
    currencies: ['/currencies/fiat/clp'],
    emoji: 'chile emoji',
    id: '/regions/cl',
    name: 'Chile',
    unsupported: false,
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: 'albania emoji',
    id: '/regions/al',
    name: 'Albania',
    unsupported: false,
  },
] as Country[];
