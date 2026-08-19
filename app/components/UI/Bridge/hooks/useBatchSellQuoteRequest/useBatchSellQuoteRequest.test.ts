import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { BATCH_SELL_QUOTE_DEBOUNCE_MS, useBatchSellQuoteRequest } from '.';
import { runBatchSellQuoteRequestCases } from './runBatchSellQuoteRequestCases';

const batchSellRequestMocks = {
  walletAddress: '0x1234567890123456789012345678901234567890' as
    | string
    | undefined,
  smartTransactionsEnabled: false,
};

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
    () => batchSellRequestMocks.walletAddress,
  ),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(
    () => batchSellRequestMocks.smartTransactionsEnabled,
  ),
}));

const mockSelectShouldUseSmartTransaction =
  selectShouldUseSmartTransaction as jest.MockedFunction<
    typeof selectShouldUseSmartTransaction
  >;

runBatchSellQuoteRequestCases({
  debounceMs: BATCH_SELL_QUOTE_DEBOUNCE_MS,
  batchSellRequestMocks,
  mockSelectShouldUseSmartTransaction,
  renderHook: (state) =>
    renderHookWithProvider(() => useBatchSellQuoteRequest(), { state }),
});
