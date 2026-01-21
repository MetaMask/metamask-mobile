import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeQuoteEvents } from '.';
import Engine from '../../../../../core/Engine';
import { createBridgeTestState } from '../../testUtils';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { RequestStatus } from '@metamask/bridge-controller';

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
    'should not publish QuotesReceived event when bridge-controller state has %s',
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
    'should publish QuotesReceived event with warnings: %s',
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
});
