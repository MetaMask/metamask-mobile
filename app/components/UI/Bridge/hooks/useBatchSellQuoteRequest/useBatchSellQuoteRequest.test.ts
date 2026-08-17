import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  BATCH_SELL_QUOTE_DEBOUNCE_MS,
  buildBatchSellQuoteRequestData,
  getBatchSellAtomicSourceAmount,
  getBatchSellSourceTokenAmount,
  hasValidBatchSellSourceAmounts,
  useBatchSellQuoteRequest,
} from '.';
import {
  mockBatchSellQuoteRequestEnv,
  runBatchSellQuoteRequestCases,
} from '../quoteTestCases/runBatchSellQuoteRequestCases';

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
  selectBatchSellSourceWalletAddress: jest.fn(
    () => mockBatchSellQuoteRequestEnv.walletAddress,
  ),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(
    () => mockBatchSellQuoteRequestEnv.smartTransactionsEnabled,
  ),
}));

runBatchSellQuoteRequestCases({
  implementation: 'legacy',
  debounceMs: BATCH_SELL_QUOTE_DEBOUNCE_MS,
  helpers: {
    getBatchSellSourceTokenAmount,
    getBatchSellAtomicSourceAmount,
    hasValidBatchSellSourceAmounts,
    buildBatchSellQuoteRequestData,
  },
  render: (state) =>
    renderHookWithProvider(() => useBatchSellQuoteRequest(), { state }),
});
