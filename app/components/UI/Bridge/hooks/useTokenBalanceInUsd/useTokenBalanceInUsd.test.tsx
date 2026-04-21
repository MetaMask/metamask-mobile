import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokenBalanceInUsd } from '.';
import { createBridgeTestState } from '../../testUtils';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  ethChainId,
  evmAccountAddress,
  initialState,
  solanaNativeTokenAddress,
} from '../../_mocks_/initialState';
import { toChecksumAddress } from '../../../../../util/address';

const nativeAddress = '0x0000000000000000000000000000000000000000' as Hex;

const stateWithUsdConversionRate = {
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: {
            conversionRate: 2000,
            usdConversionRate: 2000,
          },
        },
        conversionRate: 2000,
      },
    },
  },
} as Parameters<typeof createBridgeTestState>[1];

describe('useTokenBalanceInUsd', () => {
  it('returns the USD balance for an EVM token when usdConversionRate is available', () => {
    // sourceToken: 1.0 ETH on 0x1, market price: 1 ETH/ETH, conversionRate: 2000 USD/ETH
    // Balance is resolved from TokenBalancesController (0x0de0b6b3a7640000 = 1 ETH)
    // calcTokenFiatValue = 1.0 * 2000 * 1 = 2000
    // calcUsdAmountFromFiat = 2000 * (2000 / 2000) = 2000
    const testState = createBridgeTestState({}, {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: 2000,
                usdConversionRate: 2000,
              },
            },
            conversionRate: 2000,
          },
          TokenBalancesController: {
            tokenBalances: {
              ...initialState.engine.backgroundState.TokenBalancesController
                .tokenBalances,
              [evmAccountAddress]: {
                ...initialState.engine.backgroundState.TokenBalancesController
                  .tokenBalances[evmAccountAddress],
                [ethChainId]: {
                  ...initialState.engine.backgroundState.TokenBalancesController
                    .tokenBalances[evmAccountAddress][ethChainId],
                  [nativeAddress]: '0x0de0b6b3a7640000' as Hex, // 1 ETH
                },
              },
            },
          },
        },
      },
    } as Parameters<typeof createBridgeTestState>[1]);

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(testState.bridge.sourceToken),
      { state: testState },
    );

    expect(result.current).toBe(2000);
  });

  it('returns the correct USD balance when sourceToken.address is lowercase but TokenBalancesController stores checksummed', () => {
    const lowercaseErc20 = '0xaabbccddee1122334455667788990011aabbccdd';
    const checksummedErc20 = toChecksumAddress(lowercaseErc20) as Hex;

    const testState = createBridgeTestState(
      {
        bridgeReducerOverrides: {
          sourceToken: {
            address: lowercaseErc20,
            decimals: 18,
            symbol: 'TKN',
            chainId: ethChainId,
          },
        },
      },
      {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            CurrencyRateController: {
              currentCurrency: 'USD',
              currencyRates: {
                ETH: {
                  conversionRate: 2000,
                  usdConversionRate: 2000,
                },
              },
              conversionRate: 2000,
            },
            TokenBalancesController: {
              tokenBalances: {
                [evmAccountAddress]: {
                  [ethChainId]: {
                    [checksummedErc20]: '0x0de0b6b3a7640000' as Hex, // 1 token
                  },
                },
              },
            },
            TokenRatesController: {
              marketData: {
                [ethChainId]: {
                  [lowercaseErc20]: { price: 5 },
                },
              },
            },
          },
        },
      } as Parameters<typeof createBridgeTestState>[1],
    );

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(testState.bridge.sourceToken),
      { state: testState },
    );

    // 1 token * price 5 * conversionRate 2000 / conversionRate * (usd/conversionRate)
    // calcTokenFiatValue = 1.0 * 5 * 2000 = 10000
    // calcUsdAmountFromFiat = 10000 * (2000 / 2000) = 10000
    expect(result.current).toBe(10000);
  });

  it('returns undefined when the token has no balance in TokenBalancesController', () => {
    const sourceToken = {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      chainId: ethChainId,
    };
    const testState = createBridgeTestState(
      {
        bridgeReducerOverrides: { sourceToken },
      },
      stateWithUsdConversionRate,
    );

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(sourceToken),
      { state: testState },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns the USD balance for a non-EVM (Solana) source token from MultichainBalancesController', () => {
    // SOL balance: 100.123, rate: 100 USD/SOL
    // calcTokenFiatValue = balanceToFiatNumber(100.123, 100, 1) = 10012.3
    // calcUsdAmountFromFiat = 10012.3 * (2000 / 2000) = 10012.3
    const sourceToken = {
      address: solanaNativeTokenAddress,
      decimals: 9,
      symbol: 'SOL',
      chainId: SolScope.Mainnet,
    };
    const testState = createBridgeTestState(
      {
        bridgeReducerOverrides: { sourceToken },
      },
      stateWithUsdConversionRate,
    );

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(sourceToken),
      { state: testState },
    );

    expect(result.current).toBe(10012.3);
  });

  it('returns undefined for an EVM token with zero hex balance (0x0)', () => {
    const testState = createBridgeTestState({}, {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: 2000,
                usdConversionRate: 2000,
              },
            },
            conversionRate: 2000,
          },
          TokenBalancesController: {
            tokenBalances: {
              [evmAccountAddress]: {
                [ethChainId]: {
                  [nativeAddress]: '0x0' as Hex,
                },
              },
            },
          },
        },
      },
    } as Parameters<typeof createBridgeTestState>[1]);

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(testState.bridge.sourceToken),
      { state: testState },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined for a non-EVM token when address is missing from multichainBalances', () => {
    const sourceToken = {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:MISSING' as const,
      decimals: 9,
      symbol: 'MISSING',
      chainId: SolScope.Mainnet,
    };
    const testState = createBridgeTestState(
      {
        bridgeReducerOverrides: { sourceToken },
      },
      stateWithUsdConversionRate,
    );

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(sourceToken),
      { state: testState },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when usdConversionRate is missing', () => {
    const testState = createBridgeTestState({}, {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'EUR',
            currencyRates: {
              ETH: {
                conversionRate: 2000,
                // usdConversionRate intentionally omitted
              },
            },
            conversionRate: 2000,
          },
          TokenBalancesController: {
            tokenBalances: {
              [evmAccountAddress]: {
                [ethChainId]: {
                  [nativeAddress]: '0x0de0b6b3a7640000' as Hex, // 1 ETH
                },
              },
            },
          },
        },
      },
    } as Parameters<typeof createBridgeTestState>[1]);

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(testState.bridge.sourceToken),
      { state: testState },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when conversionRate is 0 (NaN guard)', () => {
    const testState = createBridgeTestState({}, {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: 0,
                usdConversionRate: 2000,
              },
            },
            conversionRate: 0,
          },
          TokenBalancesController: {
            tokenBalances: {
              [evmAccountAddress]: {
                [ethChainId]: {
                  [nativeAddress]: '0x0de0b6b3a7640000' as Hex, // 1 ETH
                },
              },
            },
          },
        },
      },
    } as Parameters<typeof createBridgeTestState>[1]);

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(testState.bridge.sourceToken),
      { state: testState },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when token is undefined', () => {
    const testState = createBridgeTestState(
      {
        bridgeReducerOverrides: {
          sourceToken: undefined,
        },
      },
      stateWithUsdConversionRate,
    );

    const { result } = renderHookWithProvider(
      () => useTokenBalanceInUsd(undefined),
      { state: testState },
    );

    expect(result.current).toBeUndefined();
  });
});
