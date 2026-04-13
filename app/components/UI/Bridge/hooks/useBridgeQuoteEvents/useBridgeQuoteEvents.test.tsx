import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeQuoteEvents } from '.';
import Engine from '../../../../../core/Engine';
import { createBridgeTestState } from '../../testUtils';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { RequestStatus } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  ethChainId,
  evmAccountAddress,
  initialState,
  solanaNativeTokenAddress,
} from '../../_mocks_/initialState';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    ...jest.requireActual('../../../../../core/Engine').context,
    BridgeController: {
      trackUnifiedSwapBridgeEvent: jest.fn(),
    },
  },
}));

describe('useBridgeQuoteEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [{ quotesLoadingStatus: RequestStatus.LOADING }],
    [{ quotesRefreshCount: 0 }],
    [{ quoteFetchError: 'Error fetching quotes' }],
  ])(
    'does not publish QuotesReceived event when bridge-controller state has %s',
    async (stateOverrides) => {
      const bridgeControllerOverrides = {
        quotesLoadingStatus: null,
        quoteFetchError: null,
        quotes: [mockQuoteWithMetadata],
        quotesRefreshCount: 1,
        ...stateOverrides,
      };
      const testState = createBridgeTestState({
        bridgeControllerOverrides,
      });
      renderHookWithProvider(
        () =>
          useBridgeQuoteEvents({
            hasNoQuotesAvailable: false,
            hasInsufficientBalance: false,
            hasInsufficientGas: false,
            hasTxAlert: false,
            isSubmitDisabled: false,
            isPriceImpactWarningVisible: false,
          }),
        { state: testState },
      );
      expect(
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ hasNoQuotesAvailable: true }, ['no_quotes']],
    [{ hasInsufficientGas: true }, ['insufficient_gas_for_selected_quote']],
    [{ hasInsufficientBalance: true }, ['insufficient_balance']],
    [{ hasTxAlert: true }, ['tx_alert']],
    [{ isPriceImpactWarningVisible: true }, ['price_impact']],
    [
      { hasTxAlert: true, isPriceImpactWarningVisible: true },
      ['tx_alert', 'price_impact'],
    ],
    [{}, []],
  ])(
    'publishes QuotesReceived event with warnings: %s',
    async (hookArgs, warnings) => {
      const bridgeControllerOverrides = {
        quotesLoadingStatus: null,
        quoteFetchError: null,
        quotes: [mockQuoteWithMetadata],
        quotesRefreshCount: 1,
      };
      const testState = createBridgeTestState({
        bridgeControllerOverrides,
      });
      renderHookWithProvider(
        () =>
          useBridgeQuoteEvents({
            hasNoQuotesAvailable: false,
            hasInsufficientBalance: false,
            hasInsufficientGas: false,
            hasTxAlert: false,
            isSubmitDisabled: false,
            isPriceImpactWarningVisible: false,
            ...hookArgs,
          }),
        { state: testState },
      );

      expect(
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith('Unified SwapBridge Quotes Received', {
        best_quote_provider: 'lifi_jupiter',
        can_submit: true,
        gas_included: false,
        gas_included_7702: false,
        price_impact: -0.001991570073761955,
        provider: 'lifi_jupiter',
        quoted_time_minutes: 0.08333333333333333,
        usd_balance_source: 0,
        usd_quoted_gas: 0,
        usd_quoted_return: 0,
        warnings,
      });
    },
  );

  it('computes usd_balance_source from sourceToken balance when usdConversionRate is available', async () => {
    // sourceToken: 1.0 ETH on 0x1, market price: 1 ETH/ETH, conversionRate: 2000 USD/ETH
    // Balance is resolved from TokenBalancesController (0x0de0b6b3a7640000 = 1 ETH)
    // calcTokenFiatValue = 1.0 * 2000 * 1 = 2000
    // calcUsdAmountFromFiat = 2000 * (2000 / 2000) = 2000
    const nativeAddress = '0x0000000000000000000000000000000000000000' as Hex;
    const bridgeControllerOverrides = {
      quotesLoadingStatus: null,
      quoteFetchError: null,
      quotes: [mockQuoteWithMetadata],
      quotesRefreshCount: 1,
    };
    const testState = createBridgeTestState({ bridgeControllerOverrides }, {
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

    renderHookWithProvider(
      () =>
        useBridgeQuoteEvents({
          hasNoQuotesAvailable: false,
          hasInsufficientBalance: false,
          hasInsufficientGas: false,
          hasTxAlert: false,
          isSubmitDisabled: false,
          isPriceImpactWarningVisible: false,
        }),
      { state: testState },
    );

    expect(
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledWith(
      'Unified SwapBridge Quotes Received',
      expect.objectContaining({ usd_balance_source: 2000 }),
    );
  });

  it('sets usd_balance_source to 0 when the token has no balance in TokenBalancesController', async () => {
    const bridgeControllerOverrides = {
      quotesLoadingStatus: null,
      quoteFetchError: null,
      quotes: [mockQuoteWithMetadata],
      quotesRefreshCount: 1,
    };
    const testState = createBridgeTestState(
      {
        bridgeControllerOverrides,
        bridgeReducerOverrides: {
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            symbol: 'ETH',
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
          },
        },
      } as Parameters<typeof createBridgeTestState>[1],
    );

    renderHookWithProvider(
      () =>
        useBridgeQuoteEvents({
          hasNoQuotesAvailable: false,
          hasInsufficientBalance: false,
          hasInsufficientGas: false,
          hasTxAlert: false,
          isSubmitDisabled: false,
          isPriceImpactWarningVisible: false,
        }),
      { state: testState },
    );

    expect(
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledWith(
      'Unified SwapBridge Quotes Received',
      expect.objectContaining({ usd_balance_source: 0 }),
    );
  });

  it('computes usd_balance_source for a non-EVM (Solana) source token from MultichainBalancesController', async () => {
    // SOL balance: 100.123, rate: 100 USD/SOL
    // calcTokenFiatValue = balanceToFiatNumber(100.123, 100, 1) = 10012.3
    // calcUsdAmountFromFiat = 10012.3 * (2000 / 2000) = 10012.3
    const bridgeControllerOverrides = {
      quotesLoadingStatus: null,
      quoteFetchError: null,
      quotes: [mockQuoteWithMetadata],
      quotesRefreshCount: 1,
    };
    const testState = createBridgeTestState(
      {
        bridgeControllerOverrides,
        bridgeReducerOverrides: {
          sourceToken: {
            address: solanaNativeTokenAddress,
            decimals: 9,
            symbol: 'SOL',
            chainId: SolScope.Mainnet,
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
          },
        },
      } as Parameters<typeof createBridgeTestState>[1],
    );

    renderHookWithProvider(
      () =>
        useBridgeQuoteEvents({
          hasNoQuotesAvailable: false,
          hasInsufficientBalance: false,
          hasInsufficientGas: false,
          hasTxAlert: false,
          isSubmitDisabled: false,
          isPriceImpactWarningVisible: false,
        }),
      { state: testState },
    );

    expect(
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledWith(
      'Unified SwapBridge Quotes Received',
      expect.objectContaining({ usd_balance_source: 10012.3 }),
    );
  });
});
