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
  locale: 'en-US',
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
      expect(balanceInfo?.balanceFiat).toBe('250.250000 USDC');
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

    it('uses filteredToken balance when enabled token has no availableBalance', () => {
      const enabledToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Enabled,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([
        {
          address: mockEvmToken.address?.toLowerCase() || '',
          chainId: '0xe708', // Use hex format, not CAIP format
          balance: '250.75',
          balanceFiat: '$250.75',
          symbol: 'USDC',
          decimals: 18,
        } as any,
      ]);

      const { result } = renderHook(() => useAssetBalances([enabledToken]));

      const key = `${enabledToken.address?.toLowerCase()}-${enabledToken.caipChainId}-${enabledToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(250.75);
    });

    it('uses walletAsset balance when enabled token has no availableBalance or filteredToken', () => {
      const enabledToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Enabled,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([]);

      const walletAsset = {
        address: mockEvmToken.address,
        chainId: '0xe708',
        symbol: 'USDC',
        balance: '175.50',
        balanceFiat: '$175.50',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);

      const { result } = renderHook(() => useAssetBalances([enabledToken]));

      const key = `${enabledToken.address?.toLowerCase()}-${enabledToken.caipChainId}-${enabledToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(175.5);
    });

    it('uses zero balance when enabled token has no balance sources', () => {
      const enabledToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Enabled,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([]);
      mockSelectAsset.mockReturnValue(undefined);

      const { result } = renderHook(() => useAssetBalances([enabledToken]));

      const key = `${enabledToken.address?.toLowerCase()}-${enabledToken.caipChainId}-${enabledToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(0);
    });

    it('uses filteredToken balance for non-enabled tokens', () => {
      mockUseTokensWithBalance.mockReturnValue([
        {
          address: mockNotEnabledToken.address?.toLowerCase() || '',
          chainId: '0xe708', // Use hex format, not CAIP format
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

    it('uses walletAsset balance when non-enabled token has no filteredToken', () => {
      mockUseTokensWithBalance.mockReturnValue([]);

      const walletAsset = {
        address: mockNotEnabledToken.address,
        chainId: '0xe708',
        symbol: 'DAI',
        balance: '300.25',
        balanceFiat: '$300.25',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);

      const { result } = renderHook(() =>
        useAssetBalances([mockNotEnabledToken]),
      );

      const key = `${mockNotEnabledToken.address?.toLowerCase()}-${mockNotEnabledToken.caipChainId}-${mockNotEnabledToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(300.25);
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

    it('uses availableBalance for limited tokens', () => {
      const limitedToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Limited,
        availableBalance: '50.25',
      };

      mockFormatWithThreshold.mockReturnValue('$50.25');

      const { result } = renderHook(() => useAssetBalances([limitedToken]));

      const key = `${limitedToken.address?.toLowerCase()}-${limitedToken.caipChainId}-${limitedToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(50.25);
    });

    it('uses filteredToken balance when limited token has no availableBalance', () => {
      const limitedToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Limited,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([
        {
          address: mockEvmToken.address?.toLowerCase() || '',
          chainId: '0xe708', // Use hex format, not CAIP format
          balance: '125.50',
          balanceFiat: '$125.50',
          symbol: 'USDC',
          decimals: 18,
        } as any,
      ]);

      const { result } = renderHook(() => useAssetBalances([limitedToken]));

      const key = `${limitedToken.address?.toLowerCase()}-${limitedToken.caipChainId}-${limitedToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(125.5);
    });

    it('uses walletAsset balance when limited token has no availableBalance or filteredToken', () => {
      const limitedToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Limited,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([]);

      const walletAsset = {
        address: mockEvmToken.address,
        chainId: '0xe708',
        symbol: 'USDC',
        balance: '225.75',
        balanceFiat: '$225.75',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);

      const { result } = renderHook(() => useAssetBalances([limitedToken]));

      const key = `${limitedToken.address?.toLowerCase()}-${limitedToken.caipChainId}-${limitedToken.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.rawTokenBalance).toBe(225.75);
    });

    it('uses zero balance when limited token has no balance sources', () => {
      const limitedToken = {
        ...mockEvmToken,
        allowanceState: AllowanceState.Limited,
        availableBalance: undefined,
      };

      mockUseTokensWithBalance.mockReturnValue([]);
      mockSelectAsset.mockReturnValue(undefined);

      const { result } = renderHook(() => useAssetBalances([limitedToken]));

      const key = `${limitedToken.address?.toLowerCase()}-${limitedToken.caipChainId}-${limitedToken.walletAddress?.toLowerCase()}`;
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

      expect(balanceInfo?.balanceFiat).toBe('500.500000 USDC');
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

  describe('proportional fiat calculation', () => {
    it('calculates proportional fiat when availableBalance is half of wallet balance', () => {
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
        balance: '1000',
        balanceFiat: '$1000.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '500 USDC',
      });
      mockFormatWithThreshold.mockReturnValue('$500.00');

      const tokenWithHalfBalance = {
        ...mockEvmToken,
        availableBalance: '500',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithHalfBalance]),
      );

      const key = `${tokenWithHalfBalance.address?.toLowerCase()}-${tokenWithHalfBalance.caipChainId}-${tokenWithHalfBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$500.00');
      expect(balanceInfo?.rawFiatNumber).toBe(500);
    });

    it('calculates proportional fiat when availableBalance equals wallet balance', () => {
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
        balance: '1000',
        balanceFiat: '$1000.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '1000 USDC',
      });
      mockFormatWithThreshold.mockReturnValue('$1000.00');

      const tokenWithFullBalance = {
        ...mockEvmToken,
        availableBalance: '1000',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithFullBalance]),
      );

      const key = `${tokenWithFullBalance.address?.toLowerCase()}-${tokenWithFullBalance.caipChainId}-${tokenWithFullBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$1000.00');
      expect(balanceInfo?.rawFiatNumber).toBe(1000);
    });

    it('calculates proportional fiat with comma decimal separator in balance', () => {
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
        balance: '1000',
        balanceFiat: '$1000.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '250 USDC',
      });
      mockFormatWithThreshold.mockReturnValue('$250.00');

      const tokenWithCommaBalance = {
        ...mockEvmToken,
        availableBalance: '250,00',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithCommaBalance]),
      );

      const key = `${tokenWithCommaBalance.address?.toLowerCase()}-${tokenWithCommaBalance.caipChainId}-${tokenWithCommaBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$250.00');
      expect(balanceInfo?.rawFiatNumber).toBe(250);
    });

    it('calculates very small proportional fiat values', () => {
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
        balance: '10000',
        balanceFiat: '$10000.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '0.1 USDC',
      });
      mockFormatWithThreshold.mockReturnValue('$0.10');

      const tokenWithSmallBalance = {
        ...mockEvmToken,
        availableBalance: '0.1',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithSmallBalance]),
      );

      const key = `${tokenWithSmallBalance.address?.toLowerCase()}-${tokenWithSmallBalance.caipChainId}-${tokenWithSmallBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$0.10');
      expect(balanceInfo?.rawFiatNumber).toBe(0.1);
    });

    it('falls back to token symbol when wallet balance is zero', () => {
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
        balance: '0',
        balanceFiat: '$0.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '100 USDC',
      });

      const tokenWithBalance = {
        ...mockEvmToken,
        availableBalance: '100',
      };

      const { result } = renderHook(() => useAssetBalances([tokenWithBalance]));

      const key = `${tokenWithBalance.address?.toLowerCase()}-${tokenWithBalance.caipChainId}-${tokenWithBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('100.000000 USDC');
    });

    it('falls back to token symbol when availableBalance is zero', () => {
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
        balance: '1000',
        balanceFiat: '$1000.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '0 USDC',
      });

      const tokenWithZeroBalance = {
        ...mockEvmToken,
        availableBalance: '0',
      };

      const { result } = renderHook(() =>
        useAssetBalances([tokenWithZeroBalance]),
      );

      const key = `${tokenWithZeroBalance.address?.toLowerCase()}-${tokenWithZeroBalance.caipChainId}-${tokenWithZeroBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$0.00');
    });

    it('handles walletAsset with special characters in balanceFiat', () => {
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
        balance: '1,000.50',
        balanceFiat: '$1,000.50',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '500.25 USDC',
      });
      mockFormatWithThreshold.mockReturnValue('$500.25');

      const tokenWithBalance = {
        ...mockEvmToken,
        availableBalance: '500.25',
      };

      const { result } = renderHook(() => useAssetBalances([tokenWithBalance]));

      const key = `${tokenWithBalance.address?.toLowerCase()}-${tokenWithBalance.caipChainId}-${tokenWithBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('$500.25');
      expect(balanceInfo?.rawFiatNumber).toBe(500.25);
    });

    it('falls back to token symbol when walletAsset has missing balance property', () => {
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
        balance: undefined,
        balanceFiat: '$1000.00',
        isETH: false,
        aggregators: [],
      };

      mockSelectAsset.mockReturnValue(walletAsset as any);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: 'tokenRateUndefined',
        balanceValueFormatted: '500 USDC',
      });

      const tokenWithBalance = {
        ...mockEvmToken,
        availableBalance: '500',
      };

      const { result } = renderHook(() => useAssetBalances([tokenWithBalance]));

      const key = `${tokenWithBalance.address?.toLowerCase()}-${tokenWithBalance.caipChainId}-${tokenWithBalance.walletAddress?.toLowerCase()}`;
      const balanceInfo = result.current.get(key);

      expect(balanceInfo?.balanceFiat).toBe('500.000000 USDC');
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

  describe('pre-calculated fiat reformatting', () => {
    describe('filteredToken with tokenRateUndefined', () => {
      it('shows formatted zero when balance is zero', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '0',
            balanceFiat: 'tokenRateUndefined',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        mockFormatWithThreshold.mockReturnValue('$0.00');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('$0.00');
        expect(balanceInfo?.rawFiatNumber).toBe(0);
      });

      it('shows token balance when balance is non-zero', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '100.5',
            balanceFiat: 'tokenRateUndefined',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('100.500000 USDC');
        expect(balanceInfo?.rawFiatNumber).toBeUndefined();
      });
    });

    describe('filteredToken with tokenBalanceLoading', () => {
      it('shows formatted zero when balance is zero', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '0',
            balanceFiat: 'tokenBalanceLoading',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        mockFormatWithThreshold.mockReturnValue('$0.00');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('$0.00');
        expect(balanceInfo?.rawFiatNumber).toBe(0);
      });

      it('shows token balance when balance is non-zero', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '250.75',
            balanceFiat: 'tokenBalanceLoading',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('250.750000 USDC');
        expect(balanceInfo?.rawFiatNumber).toBeUndefined();
      });
    });

    describe('filteredToken with raw fiat value', () => {
      it('reformats raw fiat string to proper currency format', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '100.5',
            balanceFiat: '55.61632 usd',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        mockFormatWithThreshold.mockReturnValue('$55.62');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('$55.62');
        expect(balanceInfo?.rawFiatNumber).toBe(55.61632);
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          55.61632,
          0.01,
          'en-US',
          expect.objectContaining({
            style: 'currency',
            currency: 'USD',
          }),
        );
      });

      it('reformats fiat with commas in numbers', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '1000',
            balanceFiat: '1,234.56 usd',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        mockFormatWithThreshold.mockReturnValue('$1,234.56');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('$1,234.56');
        expect(balanceInfo?.rawFiatNumber).toBe(1234.56);
      });

      it('formats currency mismatch values using detected currency', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        mockUseTokensWithBalance.mockReturnValue([
          {
            address: notEnabledToken.address?.toLowerCase() || '',
            chainId: '0xe708',
            balance: '100.5',
            balanceFiat: '55.61632 brl',
            symbol: 'USDC',
            decimals: 18,
          } as any,
        ]);

        mockFormatWithThreshold.mockReturnValue('R$ 55,62');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('R$ 55,62');
        expect(balanceInfo?.rawFiatNumber).toBe(55.61632);
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          55.61632,
          0.01,
          'en-US',
          expect.objectContaining({
            style: 'currency',
            currency: 'BRL',
          }),
        );
      });
    });

    describe('walletAsset with tokenRateUndefined', () => {
      it('shows formatted zero when balance is zero', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        const walletAsset = {
          address: notEnabledToken.address,
          chainId: '0xe708',
          symbol: 'USDC',
          balance: '0',
          balanceFiat: 'tokenRateUndefined',
          isETH: false,
          aggregators: [],
        };

        mockUseTokensWithBalance.mockReturnValue([]);
        mockSelectAsset.mockReturnValue(walletAsset as any);
        mockFormatWithThreshold.mockReturnValue('$0.00');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('$0.00');
        expect(balanceInfo?.rawFiatNumber).toBe(0);
      });

      it('shows token balance when balance is non-zero', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        const walletAsset = {
          address: notEnabledToken.address,
          chainId: '0xe708',
          symbol: 'USDC',
          balance: '75.25',
          balanceFiat: 'tokenRateUndefined',
          isETH: false,
          aggregators: [],
        };

        mockUseTokensWithBalance.mockReturnValue([]);
        mockSelectAsset.mockReturnValue(walletAsset as any);

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('75.250000 USDC');
        expect(balanceInfo?.rawFiatNumber).toBeUndefined();
      });
    });

    describe('walletAsset with raw fiat value', () => {
      it('reformats raw fiat string to proper currency format', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        const walletAsset = {
          address: notEnabledToken.address,
          chainId: '0xe708',
          symbol: 'USDC',
          balance: '500.50',
          balanceFiat: '15.62376 usd',
          isETH: false,
          aggregators: [],
        };

        mockUseTokensWithBalance.mockReturnValue([]);
        mockSelectAsset.mockReturnValue(walletAsset as any);
        mockFormatWithThreshold.mockReturnValue('$15.62');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('$15.62');
        expect(balanceInfo?.rawFiatNumber).toBe(15.62376);
      });

      it('formats currency mismatch values using detected currency', () => {
        const notEnabledToken = {
          ...mockNotEnabledToken,
          symbol: 'USDC',
          availableBalance: undefined,
        };

        const walletAsset = {
          address: notEnabledToken.address,
          chainId: '0xe708',
          symbol: 'USDC',
          balance: '500.50',
          balanceFiat: '15.62376 brl',
          isETH: false,
          aggregators: [],
        };

        mockUseTokensWithBalance.mockReturnValue([]);
        mockSelectAsset.mockReturnValue(walletAsset as any);
        mockFormatWithThreshold.mockReturnValue('R$ 15,62');

        const { result } = renderHook(() =>
          useAssetBalances([notEnabledToken]),
        );

        const key = `${notEnabledToken.address?.toLowerCase()}-${notEnabledToken.caipChainId}-${notEnabledToken.walletAddress?.toLowerCase()}`;
        const balanceInfo = result.current.get(key);

        expect(balanceInfo?.balanceFiat).toBe('R$ 15,62');
        expect(balanceInfo?.rawFiatNumber).toBe(15.62376);
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          15.62376,
          0.01,
          'en-US',
          expect.objectContaining({
            style: 'currency',
            currency: 'BRL',
          }),
        );
      });
    });
  });
});
