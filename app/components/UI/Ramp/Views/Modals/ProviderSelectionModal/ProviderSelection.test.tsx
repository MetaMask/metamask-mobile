import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ProviderSelection from './ProviderSelection';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import type {
  Provider,
  Quote,
  QuotesResponse,
} from '@metamask/ramps-controller';
import {
  useRampsController,
  type UseRampsControllerResult,
} from '../../../hooks/useRampsController';

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
  getQuotes: jest.fn(),
  getWidgetUrl: jest.fn(),
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

const stripeProvider: Provider = {
  id: '/providers/stripe',
  name: 'Stripe',
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

const mockProviders: Provider[] = [transakProvider, stripeProvider];

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

interface RenderOptions {
  providers?: Provider[];
  selectedProvider?: Provider | null;
  quotes?: QuotesResponse | null;
  quotesLoading?: boolean;
  quotesError?: string | null;
  ordersProviders?: string[];
}

function renderWithProvider(
  providers: Provider[] = mockProviders,
  selectedProvider: Provider | null = mockProviders[0],
  options: RenderOptions = {},
) {
  const {
    quotes = null,
    quotesLoading = false,
    quotesError = null,
    ordersProviders = [],
  } = options;

  jest.mocked(useRampsController).mockReturnValue({
    ...defaultMockController,
    providers,
    selectedProvider,
  });
  return renderScreen(
    () => (
      <ProviderSelection
        quotes={quotes}
        quotesLoading={quotesLoading}
        quotesError={quotesError}
        onProviderSelect={jest.fn()}
        onBack={mockOnBack}
      />
    ),
    {
      name: 'ProviderSelection',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
        fiatOrders: {
          orders: ordersProviders.map((providerId) => ({
            id: `order-${providerId}`,
            provider: 'RAMPS_V2',
            state: 'COMPLETED',
            data: {
              provider: { id: providerId },
            },
          })),
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
    jest.mocked(useRampsController).mockReturnValue({
      ...defaultMockController,
      userRegion: mockUserRegion,
      selectedToken: mockSelectedToken,
      providers: mockProviders,
      selectedProvider: mockProviders[0],
    });
    const { toJSON } = renderWithProvider(mockProviders, mockProviders[0], {
      quotesLoading: true,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders providers immediately when quotes are loading', () => {
    jest.mocked(useRampsController).mockReturnValue({
      ...defaultMockController,
      userRegion: mockUserRegion,
      selectedToken: mockSelectedToken,
      providers: mockProviders,
      selectedProvider: mockProviders[0],
    });
    const { getByText } = renderWithProvider(mockProviders, mockProviders[0], {
      quotesLoading: true,
    });
    expect(getByText('Transak')).toBeOnTheScreen();
  });

  it('matches snapshot when quotes fail to load', async () => {
    jest.mocked(useRampsController).mockReturnValue({
      ...defaultMockController,
      userRegion: mockUserRegion,
      selectedToken: mockSelectedToken,
      providers: mockProviders,
      selectedProvider: mockProviders[0],
    });
    const { toJSON, getByText } = renderWithProvider(
      mockProviders,
      mockProviders[0],
      { quotesError: 'Failed to load quotes' },
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

    jest.mocked(useRampsController).mockReturnValue({
      ...defaultMockController,
      userRegion: mockUserRegion,
      selectedToken: mockSelectedToken,
      providers: [transakProvider],
      selectedProvider: null,
    });

    const { getByText, queryByText } = renderWithProvider(
      [transakProvider],
      null,
      {
        quotes: {
          success: [transakQuote, stripeQuote],
          sorted: [],
          error: [],
          customActions: [],
        },
      },
    );

    await waitFor(() => {
      expect(getByText('Transak')).toBeTruthy();
    });
    expect(queryByText('Stripe')).toBeNull();
  });

  describe('Previously used tag', () => {
    it('displays "Previously used" tag for providers in order history', async () => {
      jest.mocked(useRampsController).mockReturnValue({
        ...defaultMockController,
        userRegion: mockUserRegion,
        selectedToken: mockSelectedToken,
        providers: mockProviders,
        selectedProvider: null,
      });

      const { getByText } = renderWithProvider(mockProviders, null, {
        ordersProviders: ['/providers/transak'],
      });

      await waitFor(() => {
        expect(getByText('Previously used')).toBeOnTheScreen();
      });
    });

    it('does not display tag for providers not in order history', async () => {
      jest.mocked(useRampsController).mockReturnValue({
        ...defaultMockController,
        userRegion: mockUserRegion,
        selectedToken: mockSelectedToken,
        providers: mockProviders,
        selectedProvider: null,
      });

      const { queryByText } = renderWithProvider(mockProviders, null, {
        ordersProviders: [],
      });

      await waitFor(() => {
        expect(queryByText('Previously used')).toBeNull();
      });
    });

    it('displays tag for multiple previously used providers', async () => {
      jest.mocked(useRampsController).mockReturnValue({
        ...defaultMockController,
        userRegion: mockUserRegion,
        selectedToken: mockSelectedToken,
        providers: mockProviders,
        selectedProvider: null,
      });

      const { getAllByText } = renderWithProvider(mockProviders, null, {
        ordersProviders: ['/providers/transak', '/providers/stripe'],
      });

      await waitFor(() => {
        const tags = getAllByText('Previously used');
        expect(tags).toHaveLength(2);
      });
    });
  });
});
