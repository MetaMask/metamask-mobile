import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { BATCH_SELL_QUOTE_DEBOUNCE_MS, useBatchSellQuoteRequest } from '.';
import { runBatchSellQuoteRequestCases } from './runBatchSellQuoteRequestCases';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        resetState: jest.fn(),
        updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

jest.mock('../../../../../selectors/bridge', () => ({
  selectBatchSellSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(),
}));

runBatchSellQuoteRequestCases({
  debounceMs: BATCH_SELL_QUOTE_DEBOUNCE_MS,
  renderHook: (state) =>
    renderHookWithProvider(() => useBatchSellQuoteRequest(), { state }),
});
