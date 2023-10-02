import { CryptoCurrency, FiatCurrency } from '@consensys/on-ramp-sdk';

export const mockCryptoCurrenciesData = [
  {
    id: '1',
    idv2: '2',
    network: {},
    symbol: 'ETH',
    logo: 'some_logo_url',
    decimals: 8,
    address: '0x123',
    name: 'Ethereum',
    limits: ['0.001', '8'],
  },
  {
    id: '2',
    idv2: '3',
    network: {},
    symbol: 'UNI',
    logo: 'some_logo_url',
    decimals: 8,
    address: '0x123',
    name: 'Uniswap',
    limits: ['0.001', '8'],
  },
] as CryptoCurrency[];

export const mockFiatCurrenciesData = [
  {
    id: '1',
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
    denomSymbol: '$',
  },
  {
    id: '2',
    symbol: 'EUR',
    name: 'Euro',
    decimals: 2,
    denomSymbol: '€',
  },
] as FiatCurrency[];
