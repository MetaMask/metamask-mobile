import { renderHook } from '@testing-library/react-native';
import { BridgeToken } from '../../types';
import { useBatchSellQuoteData } from '.';
import { runBatchSellQuoteDataCases } from '../quoteTestCases/runBatchSellQuoteDataCases';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

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

runBatchSellQuoteDataCases(() => renderHook(() => useBatchSellQuoteData()));
