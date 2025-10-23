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
    useRoute: () => mockRoute,
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

    expect(getByText('USDC Insights')).toBeTruthy();

    expect(getByText(strings('bridge.price'))).toBeTruthy();
    expect(getByText(strings('bridge.percent_change'))).toBeTruthy();
    expect(getByText(strings('bridge.volume'))).toBeTruthy();
    expect(getByText(strings('bridge.market_cap_fdv'))).toBeTruthy();
    expect(getByText(strings('bridge.contract_address'))).toBeTruthy();

    expect(getByText('$1.00')).toBeTruthy();
    expect(getByText('-0.01%')).toBeTruthy();
    expect(getByText('$54.44M')).toBeTruthy();
    expect(getByText('$33.59B')).toBeTruthy();
    expect(getByText('0x12345...67890')).toBeTruthy();

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
        expect(getByText('USDC Insights')).toBeTruthy();
        expect(getByText('$1.00')).toBeTruthy();
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

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: emptyState,
      });

      await waitFor(() => {
        expect(getByText('—')).toBeTruthy();
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

      expect(getByText('-0.01%')).toBeTruthy();
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

      expect(getByText('+5.25%')).toBeTruthy();
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

      expect(getByText('+0.00%')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('handles contract address copy', async () => {
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

      const { getByText } = renderWithProvider(<TokenInsightsSheet />, {
        state: mockState,
      });

      const addressElement = getByText('—');
      const touchableParent = addressElement.parent?.parent;

      if (touchableParent) {
        await act(async () => {
          fireEvent.press(touchableParent);
        });
      }

      expect(ClipboardManager.setString).not.toHaveBeenCalled();
      expect(showAlert).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
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
        expect(getByText('USDC Insights')).toBeTruthy();
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

      expect(getByText(/€/)).toBeTruthy();
    });

    it('formats large numbers correctly', () => {
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

      expect(getByText('$1.23T')).toBeTruthy();
      expect(getByText('$9.88T')).toBeTruthy();
    });
  });
});
