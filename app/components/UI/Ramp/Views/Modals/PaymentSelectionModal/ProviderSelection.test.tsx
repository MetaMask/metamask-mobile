import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ProviderSelection from './ProviderSelection';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import type { Provider, Quote } from '@metamask/ramps-controller';
import {
  useRampsController,
  type UseRampsControllerResult,
} from '../../../hooks/useRampsController';

const mockSetSelectedQuote = jest.fn();

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: jest.fn(),
}));

const mockUserRegion = {
  regionCode: 'us-ut',
  country: {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: { prefix: '+1', placeholder: '', template: '' },
    currency: 'USD',
    supported: { buy: true, sell: true },
  },
  state: null,
} as UseRampsControllerResult['userRegion'];

const mockSelectedToken = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ether',
  decimals: 18,
  iconUrl: '',
  tokenSupported: true,
} as UseRampsControllerResult['selectedToken'];

const defaultMockController: UseRampsControllerResult = {
  userRegion: null,
  setUserRegion: jest.fn(),
  selectedProvider: null,
  setSelectedProvider: jest.fn(),
  providers: [],
  providersLoading: false,
  providersError: null,
  tokens: null,
  selectedToken: null,
  setSelectedToken: jest.fn(),
  tokensLoading: false,
  tokensError: null,
  countries: [],
  countriesLoading: false,
  countriesError: null,
  paymentMethods: [],
  selectedPaymentMethod: null,
  setSelectedPaymentMethod: jest.fn(),
  paymentMethodsLoading: false,
  paymentMethodsError: null,
  quotes: null,
  selectedQuote: null,
  getQuotes: jest.fn(),
  setSelectedQuote: mockSetSelectedQuote,
  startQuotePolling: jest.fn(),
  stopQuotePolling: jest.fn(),
  quotesLoading: false,
  quotesError: null,
};

const transakProvider: Provider = {
  id: '/providers/transak',
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description: 'Test provider',
  hqAddress: 'Test Address',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 90,
  },
};

const mockProviders: Provider[] = [transakProvider];

function createMockQuote(
  providerId: string,
  providerName: string,
): Quote & { providerInfo?: { name: string } } {
  return {
    provider: providerId,
    quote: {
      amountIn: 100,
      amountOut: 0.05,
      paymentMethod: '/payments/debit-credit-card',
      amountOutInFiat: 98,
    },
    providerInfo: { name: providerName },
  };
}

const mockOnBack = jest.fn();

function renderWithProvider(
  providers: Provider[] = mockProviders,
  selectedProvider: Provider | null = mockProviders[0],
  controllerOverrides?: Partial<UseRampsControllerResult>,
) {
  jest.mocked(useRampsController).mockReturnValue({
    ...defaultMockController,
    ...controllerOverrides,
    providers,
    selectedProvider,
  });
  return renderScreen(
    () => (
      <ProviderSelection onProviderSelect={jest.fn()} onBack={mockOnBack} />
    ),
    {
      name: 'ProviderSelection',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('ProviderSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRampsController).mockReturnValue({
      ...defaultMockController,
    });
  });

  it('matches snapshot when no quotes are available', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when quotes are loading', () => {
    const { toJSON } = renderWithProvider(mockProviders, mockProviders[0], {
      userRegion: mockUserRegion,
      selectedToken: mockSelectedToken,
      quotesLoading: true,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when quotes fail to load', async () => {
    const { toJSON, getByText } = renderWithProvider(
      mockProviders,
      mockProviders[0],
      {
        userRegion: mockUserRegion,
        selectedToken: mockSelectedToken,
        quotesError: 'Failed to load quotes',
        quotesLoading: false,
      },
    );

    await waitFor(() => {
      expect(getByText('Failed to load quotes')).toBeOnTheScreen();
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider();
    fireEvent.press(getByTestId('button-icon'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('filters out quotes for providers not in the providers array', async () => {
    const transakQuote = createMockQuote('/providers/transak', 'Transak');
    const stripeQuote = createMockQuote('/providers/stripe', 'Stripe');

    const { getByText, queryByText } = renderWithProvider(
      [transakProvider],
      null,
      {
        userRegion: mockUserRegion,
        selectedToken: mockSelectedToken,
        quotes: {
          success: [transakQuote, stripeQuote],
          sorted: [],
          error: [],
          customActions: [],
        },
        quotesLoading: false,
      },
    );

    await waitFor(() => {
      expect(getByText('Transak')).toBeTruthy();
    });
    expect(queryByText('Stripe')).toBeNull();
  });
});
