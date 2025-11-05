/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAssetBalances } from './useAssetBalances';
import { AllowanceState, CardTokenAllowance } from '../types';
import { CaipChainId } from '@metamask/utils';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { formatWithThreshold } from '../../../../util/assets';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import Engine from '../../../../core/Engine';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../Tokens/util', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(),
}));
jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(),
}));
jest.mock('../util/buildTokenIconUrl', () => ({
  buildTokenIconUrl: jest.fn(),
}));
jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
}));
jest.mock('../../Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(() => []),
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: { [key: string]: string } = {
      'wallet.unable_to_find_conversion_rate': 'Unable to find conversion rate',
      'wallet.unable_to_load': 'Unable to load',
    };
    return translations[key] || key;
  }),
  default: { locale: 'en-US' },
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainAssetsRatesController: {
      state: {
        conversionRates: {},
      },
    },
    TokenRatesController: {
      state: {
        marketData: {},
      },
    },
  },
}));
jest.mock('@metamask/bridge-controller', () => ({
  isSolanaChainId: jest.fn((chainId: string) => chainId.startsWith('solana:')),
}));
jest.mock('@metamask/swaps-controller/dist/constants', () => ({
  LINEA_CHAIN_ID: '0xe708',
}));
jest.mock('../../Ramp/Deposit/constants/networks', () => ({
  SOLANA_MAINNET: {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
}));
jest.mock('../../../../util/number', () => ({
  balanceToFiatNumber: jest.fn((balance: string, rate: number) => {
    const bal = parseFloat(balance);
    return (bal * rate).toString();
  }),
}));
jest.mock('../util/safeFormatChainIdToHex', () => ({
  safeFormatChainIdToHex: jest.fn((caipChainId: string) => {
    if (caipChainId.startsWith('eip155:')) {
      const chainId = caipChainId.split(':')[1];
      return `0x${parseInt(chainId, 10).toString(16)}`;
    }
    return caipChainId;
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectAsset = selectAsset as jest.MockedFunction<typeof selectAsset>;
const mockDeriveBalanceFromAssetMarketDetails =
  deriveBalanceFromAssetMarketDetails as jest.MockedFunction<
    typeof deriveBalanceFromAssetMarketDetails
  >;
const mockFormatWithThreshold = formatWithThreshold as jest.MockedFunction<
  typeof formatWithThreshold
>;
const mockBuildTokenIconUrl = buildTokenIconUrl as jest.MockedFunction<
  typeof buildTokenIconUrl
>;
const mockUseTokensWithBalance = useTokensWithBalance as jest.MockedFunction<
  typeof useTokensWithBalance
>;

describe('useAssetBalances', () => {
  const mockEvmToken: CardTokenAllowance = {
    address: '0x1234567890123456789012345678901234567890',
    caipChainId: 'eip155:59144' as CaipChainId,
    decimals: 18,
    symbol: 'USDC',
    name: 'USD Coin',
    allowanceState: AllowanceState.Enabled,
    allowance: '1000',
    availableBalance: '500.50',
    walletAddress: '0xwallet1',
  };

  const mockSolanaToken: CardTokenAllowance = {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    allowanceState: AllowanceState.Enabled,
    allowance: '1000',
    availableBalance: '250.25',
    walletAddress: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
  };

  const mockNotEnabledToken: CardTokenAllowance = {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    caipChainId: 'eip155:59144' as CaipChainId,
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    allowanceState: AllowanceState.NotEnabled,
    allowance: '0',
    walletAddress: '0xwallet1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseSelector.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        // Mock state structure
        const state = {
          engine: {
            backgroundState: {
              NetworkController: {
                networkConfigurationsByChainId: {
                  '0xe708': {
                    nativeCurrency: 'ETH',
                  },
                },
              },
              CurrencyRateController: {
                currencyRates: {
                  ETH: {
                    conversionRate: 2000,
                  },
                },
              },
            },
          },
        };
        return selector(state);
      }
      return 'USD';
    });

    mockSelectAsset.mockReturnValue(undefined);
    mockUseTokensWithBalance.mockReturnValue([]);
    mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
      balanceFiat: '$1,000.00',
      balanceValueFormatted: '1.0 USDC',
      balance: '1.0',
      balanceFiatCalculation: 1000,
    });
    mockFormatWithThreshold.mockImplementation((value: number | null) =>
      value ? `$${value.toFixed(2)}` : '$0.00',
    );
    mockBuildTokenIconUrl.mockReturnValue('https://example.com/token-icon.png');

    // Reset Engine mocks
    (Engine.context.MultichainAssetsRatesController as any) = {
      state: {
        conversionRates: {},
      },
    };
    (Engine.context.TokenRatesController as any) = {
      state: {
        marketData: {},
      },
    };
  });

  describe('empty array handling', () => {
    it('returns empty map when given empty array', () => {
      const { result } = renderHook(() => useAssetBalances([]));

      expect(result.current.size).toBe(0);
    });

    it('returns empty map when all tokens have invalid caipChainId', () => {
      const invalidTokens: CardTokenAllowance[] = [
        { ...mockEvmToken, caipChainId: undefined as any },
        { ...mockSolanaToken, caipChainId: null as any },
      ];

      const { result } = renderHook(() => useAssetBalances(invalidTokens));

      expect(result.current.size).toBe(0);
    });
  });

  describe('single token handling', () => {
    it('returns balance info for single EVM token with availableBalance', () => {
      // Set up proper market data for EVM token
      mockUseSelector.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          const state = {
            engine: {
              backgroundState: {
                NetworkController: {
                  networkConfigurationsByChainId: {
                    '0xe708': {
                      nativeCurrency: 'ETH',
                    },
                  },
                },
                CurrencyRateController: {
                  currencyRates: {
                    ETH: {
                      conversionRate: 2000,
                    },
                  },
                },
              },
            },
          };
          return selector(state);
        }
        return 'USD';
      });

      (Engine.context.TokenRatesController as any).state.marketData = {
        '0xe708': {
          [mockEvmToken.address?.toLowerCase() as any]: {
            price: 2.0,
          },
        },
      };

      mockFormatWithThreshold.mockReturnValue('$1,001.00');

      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo).toBeDefined();
      expect(balanceInfo?.balanceFiat).toBe('$1,001.00');
      expect(balanceInfo?.rawTokenBalance).toBe(500.5);
      expect(balanceInfo?.asset).toBeDefined();
      expect(balanceInfo?.asset?.symbol).toBe('USDC');
    });

    it('returns balance info for single Solana token with conversion rate', () => {
      (
        Engine.context.MultichainAssetsRatesController as any
      ).state.conversionRates = {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
          {
            rate: '1.0',
          },
      };

      mockFormatWithThreshold.mockReturnValue('$250.25');

      const { result } = renderHook(() => useAssetBalances([mockSolanaToken]));

      const key = `${mockSolanaToken.address?.toLowerCase()}-${mockSolanaToken.caipChainId}-${mockSolanaToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo).toBeDefined();
      expect(balanceInfo?.balanceFiat).toBe('$250.25');
      expect(balanceInfo?.rawTokenBalance).toBe(250.25);
      expect(balanceInfo?.rawFiatNumber).toBe(250.25);
    });

    it('falls back to token symbol when Solana token has no conversion rate', () => {
      (
        Engine.context.MultichainAssetsRatesController as any
      ).state.conversionRates = {};

      const { result } = renderHook(() => useAssetBalances([mockSolanaToken]));

      const key = `${mockSolanaToken.address?.toLowerCase()}-${mockSolanaToken.caipChainId}-${mockSolanaToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo).toBeDefined();
      expect(balanceInfo?.balanceFiat).toBe('250.25 USDC');
      expect(balanceInfo?.rawFiatNumber).toBeUndefined();
    });
  });

  describe('multiple tokens handling', () => {
    it('returns balance info for multiple tokens at once', () => {
      mockFormatWithThreshold.mockImplementation((value: number | null) =>
        value ? `$${value.toFixed(2)}` : '$0.00',
      );

      const tokens = [mockEvmToken, mockSolanaToken, mockNotEnabledToken];

      (
        Engine.context.MultichainAssetsRatesController as any
      ).state.conversionRates = {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
          {
            rate: '1.0',
          },
      };

      mockUseTokensWithBalance.mockReturnValue([
        {
          address: mockNotEnabledToken.address?.toLowerCase() || '',
          chainId: mockNotEnabledToken.caipChainId,
          balance: '100.0',
          balanceFiat: '$100.00',
          symbol: 'DAI',
          decimals: 18,
        } as any,
      ]);

      const { result } = renderHook(() => useAssetBalances(tokens));

      expect(result.current.size).toBe(3);

      const evmKey = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const solanaKey = `${mockSolanaToken.address?.toLowerCase()}-${mockSolanaToken.caipChainId}-${mockSolanaToken.walletAddress?.toLowerCase()}`;
      const notEnabledKey = `${mockNotEnabledToken.address?.toLowerCase()}-${mockNotEnabledToken.caipChainId}-${mockNotEnabledToken.walletAddress?.toLowerCase()}`;

      expect(result.current.get(evmKey)).toBeDefined();
      expect(result.current.get(solanaKey)).toBeDefined();
      expect(result.current.get(notEnabledKey)).toBeDefined();
    });

    it('handles duplicate tokens with different wallet addresses', () => {
      const token1 = { ...mockEvmToken, walletAddress: '0xwallet1' };
      const token2 = { ...mockEvmToken, walletAddress: '0xwallet2' };

      const { result } = renderHook(() => useAssetBalances([token1, token2]));

      const key1 = `${token1.address?.toLowerCase()}-${token1.caipChainId}-0xwallet1`;
      const key2 = `${token2.address?.toLowerCase()}-${token2.caipChainId}-0xwallet2`;

      expect(result.current.size).toBe(2);
      expect(result.current.get(key1)).toBeDefined();
      expect(result.current.get(key2)).toBeDefined();
    });
  });

  describe('balance source priority', () => {
    it('uses availableBalance for enabled tokens', () => {
      const enabledToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Enabled,
        availableBalance: '100.5',
      };

      mockFormatWithThreshold.mockReturnValue('$100.50');

      const { result } = renderHook(() => useAssetBalances([enabledToken]));

      const key = `${enabledToken.address?.toLowerCase()}-${enabledToken.caipChainId}-${enabledToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(100.5);
    });

    it('uses filteredToken balance for non-enabled tokens', () => {
      mockUseTokensWithBalance.mockReturnValue([
        {
          address: mockNotEnabledToken.address?.toLowerCase() || '',
          chainId: mockNotEnabledToken.caipChainId,
          balance: '200.75',
          balanceFiat: '$200.75',
          symbol: 'DAI',
          decimals: 18,
        } as any,
      ]);

      const { result } = renderHook(() =>
        useAssetBalances([mockNotEnabledToken]),
      );

      const key = `${mockNotEnabledToken.address?.toLowerCase()}-${mockNotEnabledToken.caipChainId}-${mockNotEnabledToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(200.75);
    });

    it('falls back to walletAsset balance when filteredToken not found', () => {
      const walletAsset = {
        address: mockEvmToken.address,
        chainId: '0xe708',
        symbol: 'USDC',
        balance: '150.25',
        balanceFiat: '$150.25',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);

      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo).toBeDefined();
    });

    it('uses zero balance when no source available', () => {
      const tokenWithoutBalance = {
        ...mockNotEnabledToken,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([]);
      mockSelectAsset.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithoutBalance]),
      );

      const key = `${tokenWithoutBalance.address?.toLowerCase()}-${tokenWithoutBalance.caipChainId}-${tokenWithoutBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(0);
    });
  });

  describe('EVM token fiat calculation', () => {
    it('calculates fiat from market data when available', () => {
      mockUseSelector.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          const state = {
            engine: {
              backgroundState: {
                NetworkController: {
                  networkConfigurationsByChainId: {
                    '0xe708': {
                      nativeCurrency: 'ETH',
                    },
                  },
                },
                CurrencyRateController: {
                  currencyRates: {
                    ETH: {
                      conversionRate: 2000,
                    },
                  },
                },
              },
            },
          };
          return selector(state);
        }
        return 'USD';
      });

      (Engine.context.TokenRatesController as any).state.marketData = {
        '0xe708': {
          [mockEvmToken.address?.toLowerCase() as any]: {
            price: 1.0,
          },
        },
      };

      mockFormatWithThreshold.mockReturnValue('$1,001.00');

      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$1,001.00');
    });

    it('uses deriveBalanceFromAssetMarketDetails when no market data price', () => {
      mockUseSelector.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          const state = {
            engine: {
              backgroundState: {
                NetworkController: {
                  networkConfigurationsByChainId: {
                    '0xe708': {
                      nativeCurrency: 'ETH',
                    },
                  },
                },
                CurrencyRateController: {
                  currencyRates: {
                    ETH: {
                      conversionRate: 2000,
                    },
                  },
                },
              },
            },
          };
          return selector(state);
        }
        return 'USD';
      });

      (Engine.context.TokenRatesController as any).state.marketData = {
        '0xe708': {},
      };

      const walletAsset = {
        address: mockEvmToken.address,
        chainId: '0xe708',
        symbol: 'USDC',
        balance: '500.50',
        balanceFiat: undefined,
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);

      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: '$500.50',
        balanceValueFormatted: '500.50 USDC',
        balance: '500.50',
        balanceFiatCalculation: 500.5,
      });

      mockFormatWithThreshold.mockReturnValue('$500.50');

      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$500.50');
      expect(mockDeriveBalanceFromAssetMarketDetails).toHaveBeenCalled();
    });

    it('falls back to token symbol when no fiat calculation possible', () => {
      mockUseSelector.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          const state = {
            engine: {
              backgroundState: {
                NetworkController: {
                  networkConfigurationsByChainId: {},
                },
                CurrencyRateController: {
                  currencyRates: {},
                },
              },
            },
          };
          return selector(state);
        }
        return 'USD';
      });

      (Engine.context.TokenRatesController as any).state.marketData = {};

      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('500.50 USDC');
    });
  });

  describe('asset object creation', () => {
    it('creates asset object with token icon URL', () => {
      mockBuildTokenIconUrl.mockReturnValue(
        'https://example.com/usdc-icon.png',
      );

      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.asset).toBeDefined();
      expect(balanceInfo?.asset?.image).toBe(
        'https://example.com/usdc-icon.png',
      );
      expect(balanceInfo?.asset?.logo).toBe(
        'https://example.com/usdc-icon.png',
      );
      expect(mockBuildTokenIconUrl).toHaveBeenCalledWith(
        mockEvmToken.caipChainId,
        mockEvmToken.address,
      );
    });

    it('sets correct asset properties', () => {
      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.asset?.address).toBe(mockEvmToken.address);
      expect(balanceInfo?.asset?.symbol).toBe(mockEvmToken.symbol);
      expect(balanceInfo?.asset?.decimals).toBe(mockEvmToken.decimals);
      expect(balanceInfo?.asset?.isETH).toBe(false);
      expect(balanceInfo?.asset?.chainId).toBe('0xe708');
    });
  });

  describe('balance formatting', () => {
    it('formats balance with 6 decimal places', () => {
      const tokenWithLongBalance = {
        ...mockEvmToken,
        availableBalance: '123.456789123',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithLongBalance]),
      );

      const key = `${tokenWithLongBalance.address?.toLowerCase()}-${tokenWithLongBalance.caipChainId}-${tokenWithLongBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFormatted).toBe('123.456789 USDC');
    });

    it('handles comma decimal separator', () => {
      const tokenWithComma = {
        ...mockEvmToken,
        availableBalance: '100,50',
      };

      const { result } = renderHook(() => useAssetBalances([tokenWithComma]));

      const key = `${tokenWithComma.address?.toLowerCase()}-${tokenWithComma.caipChainId}-${tokenWithComma.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(100.5);
    });

    it('parses rawTokenBalance correctly', () => {
      const { result } = renderHook(() => useAssetBalances([mockEvmToken]));

      const key = `${mockEvmToken.address?.toLowerCase()}-${mockEvmToken.caipChainId}-${mockEvmToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(typeof balanceInfo?.rawTokenBalance).toBe('number');
      expect(balanceInfo?.rawTokenBalance).toBe(500.5);
    });
  });

  describe('Limited allowance state', () => {
    it('uses availableBalance for limited tokens', () => {
      const limitedToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Limited,
        availableBalance: '50.25',
      };

      const { result } = renderHook(() => useAssetBalances([limitedToken]));

      const key = `${limitedToken.address?.toLowerCase()}-${limitedToken.caipChainId}-${limitedToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(50.25);
    });
  });

  describe('edge cases', () => {
    it('handles token with undefined address', () => {
      const tokenWithoutAddress = {
        ...mockEvmToken,
        address: undefined,
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithoutAddress as any]),
      );

      const key = `undefined-${tokenWithoutAddress.caipChainId}-${tokenWithoutAddress.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo).toBeDefined();
    });

    it('handles token with undefined walletAddress', () => {
      const tokenWithoutWallet = {
        ...mockEvmToken,
        walletAddress: undefined,
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithoutWallet]),
      );

      const key = `${tokenWithoutWallet.address?.toLowerCase()}-${tokenWithoutWallet.caipChainId}-undefined`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo).toBeDefined();
    });

    it('handles zero balance correctly', () => {
      const tokenWithZeroBalance = {
        ...mockEvmToken,
        availableBalance: '0',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithZeroBalance]),
      );

      const key = `${tokenWithZeroBalance.address?.toLowerCase()}-${tokenWithZeroBalance.caipChainId}-${tokenWithZeroBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(0);
    });

    it('handles very large balance', () => {
      const tokenWithLargeBalance = {
        ...mockEvmToken,
        availableBalance: '999999999.123456',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithLargeBalance]),
      );

      const key = `${tokenWithLargeBalance.address?.toLowerCase()}-${tokenWithLargeBalance.caipChainId}-${tokenWithLargeBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(999999999.123456);
    });
  });
});
