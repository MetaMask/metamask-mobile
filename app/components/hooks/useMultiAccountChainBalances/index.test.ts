// Third party dependencies
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

// External dependencies.
import { RootState } from '../../../reducers';
import {
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { NETWORK_CHAIN_ID } from '../../../util/networks/customNetworks';
import { selectNetworkConfigurations } from '../../../selectors/networkController';

// Internal dependencies.
import { useMultiAccountChainBalances } from './index';
import { ChainFiatBalances } from './index.types';

// Import the actual selectors
import { selectAllTokenBalances } from '../../../selectors/tokenBalancesController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../selectors/settings';

// Import the necessary function
import { toChecksumHexAddress } from '@metamask/controller-utils';

const MOCK_TOKEN_ADDRESS_1 = '0x378afc9a77b47a30';
const MOCK_TOKEN_ADDRESS_2 = '0x2f18e6';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: RootState) => unknown) =>
    mockUseSelector(selector),
}));

// Mock the useSelector hook
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the networks utility
jest.mock('../../../util/networks', () => ({
  isTestNet: jest.fn().mockReturnValue(false),
  toHexadecimal: jest.fn((chainId) => chainId),
}));

jest.mock('../../../core/Engine', () => ({
  getTotalFiatAccountBalance: jest.fn(),
}));

describe('useMultiAccountChainBalances', () => {
  const mockAddress1 = MOCK_ADDRESS_1.toLowerCase();
  const checkSummedAddress1 = toChecksumHexAddress(mockAddress1);
  const mockAddress2 = MOCK_ADDRESS_2.toLowerCase();
  const checkSummedAddress2 = toChecksumHexAddress(mockAddress2);
  const mockMainnetChainId = NETWORK_CHAIN_ID.MAINNET;
  const mockPolygonChainId = NETWORK_CHAIN_ID.POLYGON;
  const mockTokenAddress1 = MOCK_TOKEN_ADDRESS_1;
  const mockTokenAddress2 = MOCK_TOKEN_ADDRESS_2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate balances correctly for single account and chain', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAllTokenBalances) {
        const result = {
          [mockAddress1]: {
            [mockMainnetChainId]: {
              [mockTokenAddress1]: '0x1000000000000000000',
            },
          },
        };

        return result;
      }

      if (selector === selectAllTokens) {
        const result = {
          [mockMainnetChainId]: {
            [mockAddress1]: [
              {
                address: mockTokenAddress1,
                symbol: 'TOKEN1',
                decimals: 18,
              },
            ],
          },
        };
        return result;
      }

      if (selector === selectNetworkConfigurations) {
        const result = {
          [mockMainnetChainId]: {
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
          },
        };
        return result;
      }

      if (selector === selectTokenMarketData) {
        return {
          [mockMainnetChainId]: {
            [mockTokenAddress1]: {
              price: 1000,
            },
          },
        };
      }

      if (selector === selectCurrentCurrency) {
        return 'usd';
      }

      if (selector === selectCurrencyRates) {
        const result = {
          ETH: {
            conversionRate: 1,
          },
        };
        return result;
      }

      if (selector === selectAccountsByChainId) {
        return {
          [mockMainnetChainId]: {
            [checkSummedAddress1]: {
              balance: '0x1000000000000000000',
              stakedBalance: '0x0',
            },
            [checkSummedAddress2]: {
              balance: '0x2000000000000000000',
              stakedBalance: '0x0',
            },
          },
        };
      }

      if (selector === selectShowFiatInTestnets) {
        return false;
      }

      return {};
    });

    const { result } = renderHook(() => useMultiAccountChainBalances());

    const expected: ChainFiatBalances = {
      [mockAddress1]: {
        [mockMainnetChainId]: {
          totalNativeFiatBalance: expect.any(Number),
          totalImportedTokenFiatBalance: expect.any(Number),
          totalFiatBalance: expect.any(Number),
        },
      },
    };

    expect(result.current).toMatchObject(expected);
  });

  it('should return empty object when no token balances', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAllTokenBalances) {
        return {};
      }

      if (selector === selectAllTokens) return {};
      if (selector === selectNetworkConfigurations) return {};
      if (selector === selectTokenMarketData) return {};
      if (selector === selectCurrentCurrency) return 'usd';
      if (selector === selectCurrencyRates)
        return { ETH: { conversionRate: 1 } };
      if (selector === selectAccountsByChainId)
        return { accountsByChainId: {} };
      if (selector === selectShowFiatInTestnets) return false;

      return {};
    });

    const { result } = renderHook(() => useMultiAccountChainBalances());
    expect(result.current).toEqual({});
  });

  it('should calculate balances for multiple accounts and chains', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAllTokenBalances) {
        return {
          [mockAddress1]: {
            [mockMainnetChainId]: {
              [mockTokenAddress1]: '0x1000000000000000000',
            },
            [mockPolygonChainId]: {
              [mockTokenAddress2]: '0x1000000',
            },
          },
          [mockAddress2]: {
            [mockMainnetChainId]: {
              [mockTokenAddress1]: '0x2000000000000000000',
            },
          },
        };
      }

      if (selector === selectAllTokens) {
        return {
          [mockMainnetChainId]: {
            [mockAddress1]: [
              {
                address: mockTokenAddress1,
                symbol: 'TOKEN1',
                decimals: 18,
              },
            ],
            [mockAddress2]: [
              {
                address: mockTokenAddress1,
                symbol: 'TOKEN1',
                decimals: 18,
              },
            ],
          },
          [mockPolygonChainId]: {
            [mockAddress1]: [
              {
                address: mockTokenAddress2,
                symbol: 'TOKEN2',
                decimals: 6,
              },
            ],
          },
        };
      }

      if (selector === selectNetworkConfigurations) {
        return {
          [mockMainnetChainId]: {
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
          },
          [mockPolygonChainId]: {
            name: 'Polygon',
            nativeCurrency: 'MATIC',
          },
        };
      }

      if (selector === selectTokenMarketData) {
        return {
          '0x1': {
            [mockTokenAddress1]: {
              price: 1000,
            },
          },
          '0x89': {
            [mockTokenAddress2]: {
              price: 50,
            },
          },
        };
      }

      if (selector === selectCurrentCurrency) {
        return 'usd';
      }

      if (selector === selectCurrencyRates) {
        return {
          ETH: {
            conversionRate: 1,
          },
          MATIC: {
            conversionRate: 1,
          },
        };
      }

      if (selector === selectAccountsByChainId) {
        return {
          [mockMainnetChainId]: {
            [checkSummedAddress1]: {
              balance: '0x1000000000000000000', // 1 ETH
              stakedBalance: '0x0',
            },
            [checkSummedAddress2]: {
              balance: '0x2000000000000000000', // 2 ETH
              stakedBalance: '0x0',
            },
          },
          [mockPolygonChainId]: {
            [checkSummedAddress1]: {
              balance: '0x1000000000000000000', // 1 MATIC
              stakedBalance: '0x0',
            },
          },
        };
      }

      if (selector === selectShowFiatInTestnets) {
        return false;
      }

      return {};
    });

    const { result } = renderHook(() => useMultiAccountChainBalances());

    // Verify account structure
    expect(result.current[mockAddress1]).toBeDefined();
    expect(result.current[mockAddress1][mockMainnetChainId]).toBeDefined();
    expect(result.current[mockAddress1][mockPolygonChainId]).toBeDefined();
    expect(result.current[mockAddress2]).toBeDefined();
    expect(result.current[mockAddress2][mockMainnetChainId]).toBeDefined();

    // Verify account 1 mainnet balances
    const account1MainnetBalances =
      result.current[mockAddress1][mockMainnetChainId];
    expect(account1MainnetBalances.totalNativeFiatBalance).toBe(1);
    expect(account1MainnetBalances.totalImportedTokenFiatBalance).toBeCloseTo(
      4722366.47,
      1,
    );
    expect(account1MainnetBalances.totalFiatBalance).toBeCloseTo(4722367.47, 1);

    // Verify account 1 polygon balances
    const account1PolygonBalances =
      result.current[mockAddress1][mockPolygonChainId];
    expect(account1PolygonBalances.totalNativeFiatBalance).toBe(1);
    expect(account1PolygonBalances.totalImportedTokenFiatBalance).toBeCloseTo(
      838.86,
      1,
    );
    expect(account1PolygonBalances.totalFiatBalance).toBeCloseTo(839.86, 1);

    // Verify account 2 mainnet balances
    const account2MainnetBalances =
      result.current[mockAddress2][mockMainnetChainId];
    expect(account2MainnetBalances.totalNativeFiatBalance).toBe(2);
    expect(account2MainnetBalances.totalImportedTokenFiatBalance).toBeCloseTo(
      9444732.96,
      1,
    );
    expect(account2MainnetBalances.totalFiatBalance).toBeCloseTo(9444734.96, 1);
  });

  it('should handle edge cases correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAllTokenBalances) {
        return {
          [mockAddress1]: {
            [mockMainnetChainId]: {},
          },
        };
      }

      if (selector === selectAllTokens) {
        return {
          [mockMainnetChainId]: {
            [mockAddress1]: [],
          },
        };
      }

      if (selector === selectNetworkConfigurations) {
        return {
          [mockMainnetChainId]: {
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
          },
        };
      }

      if (selector === selectTokenMarketData) {
        return {};
      }

      if (selector === selectCurrentCurrency) {
        return 'usd';
      }

      if (selector === selectCurrencyRates) {
        return {
          ETH: {
            conversionRate: 1,
          },
        };
      }

      if (selector === selectAccountsByChainId) {
        return {
          [mockMainnetChainId]: {
            [checkSummedAddress1]: {
              balance: '0x0',
              stakedBalance: '0x0',
            },
          },
        };
      }

      if (selector === selectShowFiatInTestnets) {
        return false;
      }

      return {};
    });

    const { result } = renderHook(() => useMultiAccountChainBalances());

    // Verify that we have the expected structure even with empty data
    expect(result.current[mockAddress1]).toBeDefined();
    expect(result.current[mockAddress1][mockMainnetChainId]).toBeDefined();

    // Verify that balances are zero when no data is available
    const account1MainnetBalances =
      result.current[mockAddress1][mockMainnetChainId];
    expect(account1MainnetBalances.totalNativeFiatBalance).toBe(0);
    expect(account1MainnetBalances.totalImportedTokenFiatBalance).toBe(0);
    expect(account1MainnetBalances.totalFiatBalance).toBe(0);
  });

  it('should return empty object for testnets when showFiatOnTestnets is true', () => {
    jest.requireMock('../../../util/networks').isTestNet.mockReturnValue(true);

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAllTokenBalances) {
        return {
          [mockAddress1]: {
            [mockMainnetChainId]: {
              [mockTokenAddress1]: '0x1000000000000000000',
            },
          },
        };
      }

      if (selector === selectAllTokens) {
        return {
          [mockMainnetChainId]: {
            [mockAddress1]: [
              {
                address: mockTokenAddress1,
                symbol: 'TOKEN1',
                decimals: 18,
              },
            ],
          },
        };
      }

      if (selector === selectNetworkConfigurations) {
        return {
          [mockMainnetChainId]: {
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
          },
        };
      }

      if (selector === selectTokenMarketData) {
        return {
          [mockMainnetChainId]: {
            [mockTokenAddress1]: {
              price: 1000,
            },
          },
        };
      }

      if (selector === selectCurrentCurrency) {
        return 'usd';
      }

      if (selector === selectCurrencyRates) {
        return {
          ETH: {
            conversionRate: 1,
          },
        };
      }

      if (selector === selectAccountsByChainId) {
        return {
          [mockMainnetChainId]: {
            [checkSummedAddress1]: {
              balance: '0x1000000000000000000',
              stakedBalance: '0x0',
            },
          },
        };
      }

      if (selector === selectShowFiatInTestnets) {
        return true;
      }

      return {};
    });

    const { result } = renderHook(() => useMultiAccountChainBalances());

    expect(result.current).toEqual({});

    jest.requireMock('../../../util/networks').isTestNet.mockReturnValue(false);
  });

  it('should include staked balances in the total balance calculation', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAllTokenBalances) {
        return {
          [mockAddress1]: {
            [mockMainnetChainId]: {
              [mockTokenAddress1]: '0x1000000000000000000',
            },
          },
        };
      }

      if (selector === selectAllTokens) {
        return {
          [mockMainnetChainId]: {
            [mockAddress1]: [
              {
                address: mockTokenAddress1,
                symbol: 'TOKEN1',
                decimals: 18,
              },
            ],
          },
        };
      }

      if (selector === selectNetworkConfigurations) {
        return {
          [mockMainnetChainId]: {
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
          },
        };
      }

      if (selector === selectTokenMarketData) {
        return {
          '0x1': {
            [mockTokenAddress1]: {
              price: 1000,
            },
          },
        };
      }

      if (selector === selectCurrentCurrency) {
        return 'usd';
      }

      if (selector === selectCurrencyRates) {
        return {
          ETH: {
            conversionRate: 1,
          },
        };
      }

      if (selector === selectAccountsByChainId) {
        return {
          [mockMainnetChainId]: {
            [checkSummedAddress1]: {
              balance: '0x1000000000000000000', // 1 ETH
              stakedBalance: '0x1000000000000000000', // 1 ETH staked
            },
          },
        };
      }

      if (selector === selectShowFiatInTestnets) {
        return false;
      }

      return {};
    });

    const { result } = renderHook(() => useMultiAccountChainBalances());

    // Verify account structure
    expect(result.current[mockAddress1]).toBeDefined();
    expect(result.current[mockAddress1][mockMainnetChainId]).toBeDefined();

    // Verify that staked balances are included in the total
    const account1MainnetBalances =
      result.current[mockAddress1][mockMainnetChainId];

    // Native balance should be 2 ETH (1 regular + 1 staked)
    expect(account1MainnetBalances.totalNativeFiatBalance).toBe(2);

    // Token balance should be the same as before
    expect(account1MainnetBalances.totalImportedTokenFiatBalance).toBeCloseTo(
      4722366.47,
      1,
    );

    // Total should include the staked balance
    expect(account1MainnetBalances.totalFiatBalance).toBeCloseTo(4722368.47, 1);
  });
});
