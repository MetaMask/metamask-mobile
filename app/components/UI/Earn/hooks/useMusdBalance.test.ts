import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdBalance } from './useMusdBalance';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../constants/networks';
import { RootState } from '../../../../reducers';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { toChecksumAddress } from '../../../../util/address';

jest.mock('react-redux');
jest.mock('../../../../selectors/multichainAccounts/accounts');
jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

type TokenBalancesByAddress = Record<Hex, Record<Hex, Record<Hex, string>>>;
type TokenMarketData = Record<Hex, Record<Hex, { price?: number }>>;
type NetworkConfigurations = Record<Hex, { nativeCurrency?: string }>;
type CurrencyRates = Record<string, { conversionRate?: number }>;

describe('useMusdBalance', () => {
  const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];
  const MOCK_EVM_ADDRESS = '0x0000000000000000000000000000000000000abc' as Hex;
  const mockState = {} as RootState;

  let selectedEvmAddress: Hex | undefined;
  let tokenBalancesByAddress: TokenBalancesByAddress;
  let tokenMarketDataByChainId: TokenMarketData;
  let networkConfigurationsByChainId: NetworkConfigurations;
  let currencyRatesBySymbol: CurrencyRates;
  let currentCurrency: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    selectedEvmAddress = MOCK_EVM_ADDRESS;
    tokenBalancesByAddress = {} as TokenBalancesByAddress;
    tokenMarketDataByChainId = {} as TokenMarketData;
    networkConfigurationsByChainId = {} as NetworkConfigurations;
    currencyRatesBySymbol = {} as CurrencyRates;
    currentCurrency = 'usd';

    mockSelectSelectedInternalAccountByScope.mockImplementation(
      (_state: RootState) => (scope) => {
        if (scope !== EVM_SCOPE || !selectedEvmAddress) {
          return undefined;
        }

        return { address: selectedEvmAddress } as unknown as InternalAccount;
      },
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokensBalances) {
        return tokenBalancesByAddress;
      }

      if (selector === selectTokenMarketData) {
        return tokenMarketDataByChainId;
      }

      if (selector === selectCurrencyRates) {
        return currencyRatesBySymbol;
      }

      if (selector === selectCurrentCurrency) {
        return currentCurrency;
      }

      if (selector === selectNetworkConfigurations) {
        return networkConfigurationsByChainId;
      }

      if (typeof selector === 'function') {
        return selector(mockState);
      }

      return undefined;
    });
  });

  describe('hook structure', () => {
    it('returns object with expected properties', () => {
      const { result } = renderHook(() => useMusdBalance());

      expect(result.current).toHaveProperty('hasMusdBalanceOnAnyChain');
      expect(result.current).toHaveProperty('hasMusdBalanceOnChain');

      expect(result.current).toHaveProperty('tokenBalanceByChain');
      expect(result.current).toHaveProperty('fiatBalanceByChain');
      expect(result.current).toHaveProperty('fiatBalanceFormattedByChain');

      expect(result.current).toHaveProperty('tokenBalanceAggregated');
      expect(result.current).toHaveProperty('fiatBalanceAggregated');
      expect(result.current).toHaveProperty('fiatBalanceAggregatedFormatted');
    });

    it('returns hasMusdBalanceOnAnyChain as boolean', () => {
      const { result } = renderHook(() => useMusdBalance());

      expect(typeof result.current.hasMusdBalanceOnAnyChain).toBe('boolean');
    });

    it('returns hasMusdBalanceOnChain as function', () => {
      const { result } = renderHook(() => useMusdBalance());

      expect(typeof result.current.hasMusdBalanceOnChain).toBe('function');
    });
  });

  describe('balances + fiat (Mainnet + Linea only)', () => {
    it('returns empty values when no mUSD balances exist', () => {
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {},
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.hasMusdBalanceOnChain(CHAIN_IDS.MAINNET)).toBe(
        false,
      );
      expect(
        result.current.hasMusdBalanceOnChain(CHAIN_IDS.LINEA_MAINNET),
      ).toBe(false);

      expect(result.current.tokenBalanceByChain).toEqual({});
      expect(result.current.fiatBalanceByChain).toEqual({});
      expect(result.current.fiatBalanceFormattedByChain).toEqual({});

      expect(result.current.tokenBalanceAggregated).toBe('0');
      expect(result.current.fiatBalanceAggregated).toBeUndefined();
      expect(result.current.fiatBalanceAggregatedFormatted).toBeUndefined();
    });

    it('computes per-chain and aggregated values when rates are available', () => {
      // 1 mUSD with 6 decimals -> 1_000_000 minimal units -> 0x0f4240
      const oneMusdMinimalHex = '0x0f4240' as Hex;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: oneMusdMinimalHex,
          },
        },
      };

      // 1 mUSD = 0.0005 ETH, ETH = 2000 (preferred currency) -> 1 mUSD = 1 fiat
      const checksummedMusdAddress = toChecksumAddress(MUSD_ADDRESS);
      tokenMarketDataByChainId = {
        [CHAIN_IDS.MAINNET]: {
          [checksummedMusdAddress]: { price: 0.0005 },
        },
      } as TokenMarketData;
      networkConfigurationsByChainId = {
        [CHAIN_IDS.MAINNET]: { nativeCurrency: 'ETH' },
      } as NetworkConfigurations;
      currencyRatesBySymbol = {
        ETH: { conversionRate: 2000 },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.hasMusdBalanceOnChain(CHAIN_IDS.MAINNET)).toBe(
        true,
      );
      expect(
        result.current.hasMusdBalanceOnChain(CHAIN_IDS.LINEA_MAINNET),
      ).toBe(false);

      expect(result.current.tokenBalanceByChain[CHAIN_IDS.MAINNET]).toBe('1');
      expect(result.current.tokenBalanceAggregated).toBe('1');

      expect(result.current.fiatBalanceByChain[CHAIN_IDS.MAINNET]).toBe('1');
      expect(result.current.fiatBalanceAggregated).toBe('1');

      expect(
        result.current.fiatBalanceFormattedByChain[CHAIN_IDS.MAINNET],
      ).toBe('$1.00');
      expect(result.current.fiatBalanceAggregatedFormatted).toBe('$1.00');
    });

    it('returns token balances but omits fiat when conversion rate is missing', () => {
      const balance = '0x0f4240' as Hex;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: balance,
          },
        },
      };

      const checksummedMusdAddress = toChecksumAddress(MUSD_ADDRESS);
      tokenMarketDataByChainId = {
        [CHAIN_IDS.MAINNET]: {
          [checksummedMusdAddress]: { price: 0.0005 },
        },
      } as TokenMarketData;
      networkConfigurationsByChainId = {
        [CHAIN_IDS.MAINNET]: { nativeCurrency: 'ETH' },
      } as NetworkConfigurations;
      currencyRatesBySymbol = {
        // ETH conversionRate missing
        ETH: {},
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.tokenBalanceByChain[CHAIN_IDS.MAINNET]).toBe('1');
      expect(result.current.tokenBalanceAggregated).toBe('1');

      expect(
        result.current.fiatBalanceByChain[CHAIN_IDS.MAINNET],
      ).toBeUndefined();
      expect(
        result.current.fiatBalanceFormattedByChain[CHAIN_IDS.MAINNET],
      ).toBeUndefined();
      expect(result.current.fiatBalanceAggregated).toBeUndefined();
      expect(result.current.fiatBalanceAggregatedFormatted).toBeUndefined();
    });

    it('returns token balances but omits fiat when token price is missing', () => {
      // Arrange
      const balance = '0x0f4240' as Hex; // 1 mUSD (6 decimals)
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: balance,
          },
        },
      };

      networkConfigurationsByChainId = {
        [CHAIN_IDS.MAINNET]: { nativeCurrency: 'ETH' },
      } as NetworkConfigurations;
      currencyRatesBySymbol = {
        ETH: { conversionRate: 2000 },
      };
      tokenMarketDataByChainId = {
        [CHAIN_IDS.MAINNET]: {
          // price omitted
          [toChecksumAddress(MUSD_ADDRESS)]: {},
        },
      } as TokenMarketData;

      // Act
      const { result } = renderHook(() => useMusdBalance());

      // Assert
      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.tokenBalanceByChain[CHAIN_IDS.MAINNET]).toBe('1');
      expect(result.current.tokenBalanceAggregated).toBe('1');

      expect(
        result.current.fiatBalanceByChain[CHAIN_IDS.MAINNET],
      ).toBeUndefined();
      expect(
        result.current.fiatBalanceFormattedByChain[CHAIN_IDS.MAINNET],
      ).toBeUndefined();
      expect(result.current.fiatBalanceAggregated).toBeUndefined();
      expect(result.current.fiatBalanceAggregatedFormatted).toBeUndefined();
    });
  });

  describe('balance detection', () => {
    it('returns hasMusdBalanceOnAnyChain false when MUSD balance is 0x0', () => {
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: '0x0',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.tokenBalanceByChain).toEqual({});
    });

    it('returns hasMusdBalanceOnAnyChain true when MUSD balance exists on mainnet', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.hasMusdBalanceOnChain(CHAIN_IDS.MAINNET)).toBe(
        true,
      );
    });

    it('returns hasMusdBalanceOnAnyChain true when MUSD balance exists on Linea', () => {
      const lineaMusdAddress =
        MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];
      const balance = '0x5678';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.LINEA_MAINNET]: {
            [lineaMusdAddress]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(
        result.current.hasMusdBalanceOnChain(CHAIN_IDS.LINEA_MAINNET),
      ).toBe(true);
    });

    it('ignores BSC even when balance exists there', () => {
      const bscMusdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.BSC];
      const balance = '0x9abc';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.BSC]: {
            [bscMusdAddress]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.tokenBalanceByChain).toEqual({});
    });

    it('returns balances from multiple supported chains', () => {
      const mainnetBalance = '0x1111';
      const lineaBalance = '0x2222';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET]]: mainnetBalance,
          },
          [CHAIN_IDS.LINEA_MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET]]:
              lineaBalance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.hasMusdBalanceOnChain(CHAIN_IDS.MAINNET)).toBe(
        true,
      );
      expect(
        result.current.hasMusdBalanceOnChain(CHAIN_IDS.LINEA_MAINNET),
      ).toBe(true);
    });
  });

  describe('address case handling', () => {
    it('handles lowercase token address in balances', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS.toLowerCase()]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
    });

    it('handles checksummed token address in balances', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [toChecksumAddress(MUSD_ADDRESS)]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns empty balances when selected EVM address is undefined', () => {
      selectedEvmAddress = undefined;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: '0x1234',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.tokenBalanceByChain).toEqual({});
    });

    it('ignores non-MUSD tokens on supported chains', () => {
      const otherTokenAddress =
        '0x1234567890abcdef1234567890abcdef12345678' as Hex;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [otherTokenAddress]: '0x9999',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.tokenBalanceByChain).toEqual({});
    });

    it('ignores MUSD-like tokens on unsupported chains', () => {
      const polygonChainId = '0x89' as Hex;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [polygonChainId]: {
            [MUSD_ADDRESS]: '0x1234',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.tokenBalanceByChain).toEqual({});
    });

    it('handles mixed zero and non-zero balances correctly', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET]]: '0x0',
          },
          [CHAIN_IDS.LINEA_MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET]]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(
        result.current.hasMusdBalanceOnChain(CHAIN_IDS.LINEA_MAINNET),
      ).toBe(true);
      expect(result.current.hasMusdBalanceOnChain(CHAIN_IDS.MAINNET)).toBe(
        false,
      );
    });

    it('handles undefined chain balances gracefully', () => {
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: undefined as unknown as Record<
            Hex,
            Record<Hex, string>
          >,
        },
      } as unknown as TokenBalancesByAddress;

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.tokenBalanceByChain).toEqual({});
    });
  });
});
