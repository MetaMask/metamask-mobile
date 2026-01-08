import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import ClipboardManager from '../../../../../core/ClipboardManager';
import Engine from '../../../../../core/Engine';
import { handleFetch } from '@metamask/controller-utils';
import { showAlert } from '../../../../../actions/alert';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
  NetworkType: {
    mainnet: 'mainnet',
    goerli: 'goerli',
    sepolia: 'sepolia',
    localhost: 'localhost',
    rpc: 'rpc',
  },
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn().mockReturnValue('eip155:1'),
  isNonEvmChainId: jest.fn().mockReturnValue(false),
  isNativeAddress: jest
    .fn()
    .mockImplementation(
      (address) =>
        address === '0x0000000000000000000000000000000000000000' ||
        address === '0x0' ||
        address === '0',
    ),
}));

jest.mock('../../../../../actions/alert', () => ({
  showAlert: jest.fn((params) => ({
    type: 'SHOW_ALERT',
    ...params,
  })),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryDataController: {
      fetchTokenDisplayData: jest.fn(),
    },
  },
}));

jest.mock('../../hooks/useBridgeExchangeRates', () => ({
  useBridgeExchangeRates: jest.fn(),
}));

import TokenInsightsSheet from './TokenInsightsSheet';
import { isNativeAddress } from '@metamask/bridge-controller';

const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    token: {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: '0x1',
      balance: '100',
      balanceFiat: '$100.00',
      image: 'https://example.com/usdc.png',
      currencyExchangeRate: 1.0,
    },
    networkName: 'Ethereum Mainnet',
  },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: jest.fn(() => mockRoute),
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

const mockMarketData = {
  price: 0.9999,
  pricePercentChange1d: -0.01,
  totalVolume: 54440464.6,
  marketCap: 33591234567,
  dilutedMarketCap: 33591234567,
};

const mockState = {
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currentCurrency: 'USD',
      },
      TokenRatesController: {
        marketData: {
          ['0x1' as Hex]: {
            ['0x1234567890123456789012345678901234567890' as Hex]: {
              tokenAddress: '0x1234567890123456789012345678901234567890' as Hex,
              currency: 'USD',
              price: 0.9999,
              pricePercentChange1d: -0.01,
              totalVolume: 54440464.6,
              marketCap: 33591234567,
              dilutedMarketCap: 33591234567,
            },
          },
        },
      },
      TokenSearchDiscoveryDataController: {
        tokenDisplayData: [
          {
            found: true,
            chainId: '0x1' as Hex,
            address: '0x1234567890123456789012345678901234567890',
            currency: 'USD',
            token: {
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
            },
            price: mockMarketData,
          },
        ],
      },
      PreferencesController: {
        ipfsGateway: 'https://dweb.link/ipfs/',
        useTokenDetection: true,
        useNftDetection: false,
        isIpfsGatewayEnabled: true,
      },
    },
  },
};

describe('TokenInsightsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.params = {
      token: {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: '0x1',
        balance: '100',
        balanceFiat: '$100.00',
        image: 'https://example.com/usdc.png',
        currencyExchangeRate: 1.0,
      },
      networkName: 'Ethereum Mainnet',
    };
  });

  it('renders correctly with token data', () => {
    const { getByText, toJSON } = renderWithProvider(<TokenInsightsSheet />, {
      state: mockState,
    });

    expect(getByText('USDC Insights')).toBeOnTheScreen();

    expect(getByText(strings('bridge.price'))).toBeOnTheScreen();
    expect(getByText(strings('bridge.percent_change'))).toBeOnTheScreen();
    expect(getByText(strings('bridge.volume'))).toBeOnTheScreen();
    expect(getByText(strings('bridge.market_cap_fdv'))).toBeOnTheScreen();
    expect(getByText(strings('bridge.contract_address'))).toBeOnTheScreen();

    expect(getByText('$1.00')).toBeOnTheScreen();
    expect(getByText('-0.01%')).toBeOnTheScreen();
    expect(getByText('$54.44M')).toBeOnTheScreen();
    expect(getByText('$33.59B')).toBeOnTheScreen();
    expect(getByText('0x12345...67890')).toBeOnTheScreen();

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with Solana token data', async () => {
    mockRoute.params.token = {
      address:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      balance: '100',
      balanceFiat: '$100.00',
      image: 'https://example.com/usdc-sol.png',
      currencyExchangeRate: 1.0,
    };

    (isNativeAddress as jest.Mock).mockImplementation(() => false);

    const solAssetId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    (handleFetch as jest.Mock).mockResolvedValueOnce({
      [solAssetId]: {
        usd: 1.0,
        pricePercentChange: { P1D: -0.01 },
        totalVolume: 54440464.6,
        marketCap: 33591234567,
        dilutedMarketCap: 33591234567,
      },
    });

    const { getByText, toJSON } = renderWithProvider(<TokenInsightsSheet />, {
      state: mockState,
    });

    await waitFor(() => {
      expect(getByText('USDC Insights')).toBeOnTheScreen();

      expect(getByText(strings('bridge.price'))).toBeOnTheScreen();
      expect(getByText(strings('bridge.percent_change'))).toBeOnTheScreen();
      expect(getByText(strings('bridge.volume'))).toBeOnTheScreen();
      expect(getByText(strings('bridge.market_cap_fdv'))).toBeOnTheScreen();
      expect(getByText(strings('bridge.contract_address'))).toBeOnTheScreen();

      expect(getByText('$1.00')).toBeOnTheScreen();
      expect(getByText('-0.01%')).toBeOnTheScreen();
      expect(getByText('$54.44M')).toBeOnTheScreen();
      expect(getByText('$33.59B')).toBeOnTheScreen();
      expect(getByText('EPjFWd...Dt1v')).toBeOnTheScreen();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  describe('Market Data', () => {
    it('fetches market data from API when not in cache', async () => {
      const emptyState = {
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currentCurrency: 'USD',
            },
            TokenRatesController: {
              marketData: {},
            },
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: false,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                },
              ],
            },
            PreferencesController: {
              ipfsGateway: 'https://dweb.link/ipfs/',
              useTokenDetection: true,
              useNftDetection: false,
              isIpfsGatewayEnabled: true,
            },
          },
        },
      };

      const mockApiResponse = {
        'eip155:1/erc20:0x1234567890123456789012345678901234567890': {
          price: 0.9999,
          pricePercentChange: { P1D: -0.01 },
          totalVolume: 54440464.6,
          marketCap: 33591234567,
        },
      };

      (handleFetch as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: emptyState,
      });

      await waitFor(() => {
        expect(handleFetch).toHaveBeenCalled();
        expect(getByText('USDC Insights')).toBeOnTheScreen();
        expect(getByText('$1.00')).toBeOnTheScreen();
      });
    });

    it('displays fallback values when no market data available', async () => {
      const emptyState = {
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currentCurrency: 'USD',
            },
            TokenRatesController: {
              marketData: {},
            },
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: false,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                },
              ],
            },
            PreferencesController: {
              ipfsGateway: 'https://dweb.link/ipfs/',
              useTokenDetection: true,
              useNftDetection: false,
              isIpfsGatewayEnabled: true,
            },
          },
        },
      };

      // Remove currencyExchangeRate from token
      // @ts-expect-error - Testing undefined value
      mockRoute.params.token.currencyExchangeRate = undefined;

      (handleFetch as jest.Mock).mockResolvedValueOnce({});

      const { getAllByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: emptyState,
      });

      await waitFor(() => {
        const dashElements = getAllByText('—');
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });

    it('formats negative percent change correctly', () => {
      const stateWithNegativeChange = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
          },
        },
      };

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: stateWithNegativeChange,
      });

      expect(getByText('-0.01%')).toBeOnTheScreen();
    });

    it('formats positive percent change correctly', () => {
      const stateWithPositiveChange = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: true,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                  token: {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    decimals: 6,
                  },
                  price: {
                    ...mockMarketData,
                    pricePercentChange1d: 5.25,
                  },
                },
              ],
            },
          },
        },
      };

      const { getByText, toJSON } = renderWithProvider(<TokenInsightsSheet />, {
        state: stateWithPositiveChange,
      });

      expect(getByText('+5.25%')).toBeOnTheScreen();
      expect(toJSON()).toMatchSnapshot();
    });

    it('displays zero percent change correctly', () => {
      const stateWithZeroChange = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: true,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                  token: {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    decimals: 6,
                  },
                  price: {
                    ...mockMarketData,
                    pricePercentChange1d: 0,
                  },
                },
              ],
            },
          },
        },
      };

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: stateWithZeroChange,
      });

      expect(getByText('+0.00%')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('copies contract address to clipboard when the copy button is pressed', async () => {
      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      const addressElement = getByText('0x12345...67890');
      const touchableParent = addressElement.parent?.parent;

      if (touchableParent) {
        await act(async () => {
          fireEvent.press(touchableParent);
        });

        expect(ClipboardManager.setString).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890',
        );

        expect(showAlert).toHaveBeenCalledWith({
          isVisible: true,
          autodismiss: 1500,
          content: 'clipboard-alert',
          data: { msg: strings('transactions.address_copied_to_clipboard') },
        });
      }
    });

    it('does not copy when address is not available', async () => {
      mockRoute.params.token.address = '';

      const { queryByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      // When address is empty, contract address section should not be shown at all
      expect(queryByText(strings('bridge.contract_address'))).toBeNull();
      expect(ClipboardManager.setString).not.toHaveBeenCalled();
    });
  });

  describe('Token Display Data', () => {
    it('fetches token display data when not found', () => {
      const stateWithoutTokenData = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: false,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                },
              ],
            },
          },
        },
      };

      renderWithProvider(<TokenInsightsSheet />, {
        state: stateWithoutTokenData,
      });

      expect(
        Engine.context.TokenSearchDiscoveryDataController.fetchTokenDisplayData,
      ).toHaveBeenCalledWith(
        '0x1',
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('handles API fetch errors gracefully', async () => {
      const emptyState = {
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currentCurrency: 'USD',
            },
            TokenRatesController: {
              marketData: {},
            },
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: false,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                },
              ],
            },
            PreferencesController: {
              ipfsGateway: 'https://dweb.link/ipfs/',
              useTokenDetection: true,
              useNftDetection: false,
              isIpfsGatewayEnabled: true,
            },
          },
        },
      };

      (handleFetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: emptyState,
      });

      await waitFor(() => {
        expect(getByText('USDC Insights')).toBeOnTheScreen();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch market data:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Currency Formatting', () => {
    it('formats price with different currencies', () => {
      const stateWithEUR = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            CurrencyRateController: {
              currentCurrency: 'EUR',
            },
          },
        },
      };

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: stateWithEUR,
      });

      expect(getByText(/€/)).toBeOnTheScreen();
    });

    it('formats large numbers using abbreviated notation (T for trillion)', () => {
      const stateWithLargeNumbers = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokenSearchDiscoveryDataController: {
              tokenDisplayData: [
                {
                  found: true,
                  chainId: '0x1' as Hex,
                  address: '0x1234567890123456789012345678901234567890',
                  currency: 'USD',
                  token: {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    decimals: 6,
                  },
                  price: {
                    price: 1.0,
                    pricePercentChange1d: 0,
                    totalVolume: 1234567890123,
                    marketCap: 9876543210987,
                    dilutedMarketCap: 9876543210987,
                  },
                },
              ],
            },
          },
        },
      };

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: stateWithLargeNumbers,
      });

      expect(getByText('$1.23T')).toBeOnTheScreen();
      expect(getByText('$9.88T')).toBeOnTheScreen();
    });
  });

  describe('Token Avatar Display', () => {
    it('renders token avatar with image when image URL is provided', () => {
      const { getByTestId } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      const avatar = getByTestId('token-insights-icon-USDC');
      expect(avatar).toBeOnTheScreen();
    });

    it('renders token avatar with fallback icon when image URL is not provided', () => {
      const tokenWithoutImage = {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'CUSTOM',
        name: 'Custom Token',
        decimals: 18,
        chainId: '0x1',
        balance: '100',
        balanceFiat: '$100.00',
        currencyExchangeRate: 1.0,
      };
      // @ts-expect-error - Testing missing image property
      mockRoute.params.token = tokenWithoutImage;

      const { getByTestId } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      const avatar = getByTestId('token-insights-icon-CUSTOM');
      expect(avatar).toBeOnTheScreen();
    });

    it('renders token avatar with fallback icon when image URL is empty string', () => {
      mockRoute.params.token = {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        chainId: '0x1',
        balance: '50',
        balanceFiat: '$50.00',
        image: '',
        currencyExchangeRate: 1.0,
      };

      const { getByTestId } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      const avatar = getByTestId('token-insights-icon-TEST');
      expect(avatar).toBeOnTheScreen();
    });
  });

  describe('Contract Address Display', () => {
    it('hides contract address for EVM native tokens', () => {
      mockRoute.params.token = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: '0x1',
        balance: '100',
        balanceFiat: '$100.00',
        image: 'https://example.com/eth.png',
        currencyExchangeRate: 3000.0,
      };

      const { queryByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      // Contract address section should not be visible
      expect(queryByText(strings('bridge.contract_address'))).toBeNull();
    });

    it('hides contract address for Solana native tokens', () => {
      mockRoute.params.token = {
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        balance: '10',
        balanceFiat: '$1000.00',
        image: 'https://example.com/sol.png',
        currencyExchangeRate: 100.0,
      };

      const { queryByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      expect(queryByText(strings('bridge.contract_address'))).toBeNull();
    });

    it('hides contract address for Bitcoin native tokens', () => {
      mockRoute.params.token = {
        address: '0',
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        balance: '0.5',
        balanceFiat: '$25000.00',
        image: 'https://example.com/btc.png',
        currencyExchangeRate: 50000.0,
      };

      const { queryByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      expect(queryByText(strings('bridge.contract_address'))).toBeNull();
    });

    it('shows contract address for regular tokens', () => {
      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      expect(getByText(strings('bridge.contract_address'))).toBeOnTheScreen();
      expect(getByText('0x12345...67890')).toBeOnTheScreen();
    });

    it('displays extracted token address from CAIP address for Solana tokens', async () => {
      mockRoute.params.token = {
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        balance: '100',
        balanceFiat: '$100.00',
        image: 'https://example.com/usdc-sol.png',
        currencyExchangeRate: 1.0,
      };

      (isNativeAddress as jest.Mock).mockImplementation(() => false);

      // Mock the API fetch for Solana token market data
      (handleFetch as jest.Mock).mockResolvedValueOnce({
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
          {
            usd: 1.0,
            pricePercentChange: { P1D: 0 },
          },
      });

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      await waitFor(() => {
        expect(getByText(strings('bridge.contract_address'))).toBeOnTheScreen();
      });

      expect(getByText('EPjFWd...Dt1v')).toBeOnTheScreen();
    });

    it('copies parsed address for EVM tokens', async () => {
      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      const addressText = getByText('0x12345...67890');
      const touchableOpacity = addressText.parent?.parent;

      await act(async () => {
        if (touchableOpacity) {
          fireEvent.press(touchableOpacity);
        }
      });

      expect(ClipboardManager.setString).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
      );
    });
  });
});
