import { act } from '@testing-library/react-native';
import type { AnyAction } from 'redux';
import { BridgeToken } from '../../types';
import { useBatchSellQuoteData } from '.';
import rootReducer from '../../../../../reducers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { runBatchSellQuoteDataCases } from '../quoteTestCaseRunners/runBatchSellQuoteDataCases';

jest.mock('../useBatchSellQuoteRequest', () => ({
  getBatchSellAtomicSourceAmount: jest.fn(
    (_token: BridgeToken, sourceAmount?: string) =>
      sourceAmount && Number(sourceAmount) > 0 ? '1' : undefined,
  ),
  hasValidBatchSellSourceAmounts: jest.fn(
    (
      _sourceTokens: BridgeToken[],
      batchSellSourceTokenAmounts: Record<string, string | undefined>,
    ) =>
      Object.values(batchSellSourceTokenAmounts).some(
        (amount) => amount !== undefined && Number(amount) > 0,
      ),
  ),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        state: {
          batchSellTrades: undefined,
          batchSellTradesLoadingStatus: undefined,
          quotesLoadingStatus: undefined,
        },
        updateBatchSellTrades: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

runBatchSellQuoteDataCases(() => {
  const rendered = renderHookWithProvider(() => useBatchSellQuoteData());

  // useSelector skips the selector when store.getState() is the same reference
  rendered.store.replaceReducer((state, action: AnyAction) => {
    const next = rootReducer(state, action);
    return action.type === '@@TEST/RERENDER' ? { ...next } : next;
  });

  return {
    result: rendered.result,
    rerender: () => {
      act(() => {
        rendered.store.dispatch({ type: '@@TEST/RERENDER' });
      });
    },
  };
});
