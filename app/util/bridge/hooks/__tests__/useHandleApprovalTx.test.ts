import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import useHandleApprovalTx, {
  APPROVAL_TX_ERROR,
} from '../useHandleApprovalTx';
import { DummyQuotesWithApproval } from '../../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';
import { QuoteResponse } from '../../../../components/UI/Bridge/types';

// Mock the useHandleTx hook
const mockHandleTx = jest.fn();
jest.mock('../useHandleTx', () => ({
  __esModule: true,
  default: () => ({
    handleTx: mockHandleTx,
  }),
}));

describe('useHandleApprovalTx', () => {
  const mockQuote = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle approval transaction successfully', async () => {
    const mockTxMeta = { id: '123', status: 'submitted' };
    mockHandleTx.mockResolvedValueOnce(mockTxMeta);

    const { result } = renderHook(() => useHandleApprovalTx());

    const txMeta = await result.current.handleApprovalTx({
      approval: mockQuote.approval,
      quoteResponse: mockQuote as QuoteResponse,
    });

    expect(mockHandleTx).toHaveBeenCalledWith({
      txType: TransactionType.bridgeApproval,
      txParams: mockQuote.approval,
      fieldsToAddToTxMeta: {
        sourceTokenSymbol: mockQuote.quote.srcAsset.symbol,
      },
    });
    expect(txMeta).toBe(mockTxMeta);
  });

  it('should throw error when approval transaction fails', async () => {
    const mockError = new Error('Transaction failed');
    mockHandleTx.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useHandleApprovalTx());

    await expect(
      result.current.handleApprovalTx({
        approval: mockQuote.approval,
        quoteResponse: mockQuote as QuoteResponse,
      }),
    ).rejects.toThrow(`${APPROVAL_TX_ERROR}: ${mockError}`);

    expect(mockHandleTx).toHaveBeenCalledWith({
      txType: TransactionType.bridgeApproval,
      txParams: mockQuote.approval,
      fieldsToAddToTxMeta: {
        sourceTokenSymbol: mockQuote.quote.srcAsset.symbol,
      },
    });
  });
}); 