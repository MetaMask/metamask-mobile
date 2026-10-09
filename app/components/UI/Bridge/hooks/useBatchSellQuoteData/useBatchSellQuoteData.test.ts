import { renderHook } from '@testing-library/react-native';

import { useBatchSellQuoteData } from '.';
import { runBatchSellQuoteDataCases } from './runBatchSellQuoteDataCases';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
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

runBatchSellQuoteDataCases({
  renderHook: () => renderHook(() => useBatchSellQuoteData()),
});
