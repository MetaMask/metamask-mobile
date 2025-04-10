import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import useHandleBridgeTx from './useHandleBridgeTx';
import useHandleTx from './useHandleTx';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { DummyQuotesWithApproval } from '../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';

// Mock the useHandleTx hook
jest.mock('./useHandleTx', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useHandleBridgeTx', () => {
  const mockHandleTx = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useHandleTx as jest.Mock).mockReturnValue({ handleTx: mockHandleTx });
  });

  it('should handle bridge transaction correctly', async () => {
    const mockQuoteResponse = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

    const mockApprovalTxId = 'approval-tx-123';

    mockHandleTx.mockResolvedValueOnce({ hash: 'tx-hash-123' });

    const { result } = renderHook(() => useHandleBridgeTx());

    const txMeta = await result.current.handleBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse,
      approvalTxId: mockApprovalTxId,
    });

    expect(mockHandleTx).toHaveBeenCalledWith({
      txType: TransactionType.bridge,
      txParams: mockQuoteResponse.trade,
      fieldsToAddToTxMeta: {
        destinationChainId: '0x42161',
        sourceTokenAmount: mockQuoteResponse.quote.srcTokenAmount,
        sourceTokenSymbol: mockQuoteResponse.quote.srcAsset.symbol,
        sourceTokenDecimals: mockQuoteResponse.quote.srcAsset.decimals,
        sourceTokenAddress: mockQuoteResponse.quote.srcAsset.address,
        destinationTokenAmount: mockQuoteResponse.quote.destTokenAmount,
        destinationTokenSymbol: mockQuoteResponse.quote.destAsset.symbol,
        destinationTokenDecimals: mockQuoteResponse.quote.destAsset.decimals,
        destinationTokenAddress: mockQuoteResponse.quote.destAsset.address,
        approvalTxId: mockApprovalTxId,
        swapTokenValue: '10000000000000',
      },
    });

    expect(txMeta).toEqual({ hash: 'tx-hash-123' });
  });

  it('should handle undefined approvalTxId', async () => {
    const mockQuoteResponse = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

    mockHandleTx.mockResolvedValueOnce({ hash: 'tx-hash-456' });

    const { result } = renderHook(() => useHandleBridgeTx());

    const txMeta = await result.current.handleBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse,
      approvalTxId: undefined,
    });

    expect(mockHandleTx).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldsToAddToTxMeta: expect.objectContaining({
          approvalTxId: undefined,
        }),
      }),
    );

    expect(txMeta).toEqual({ hash: 'tx-hash-456' });
  });
});
