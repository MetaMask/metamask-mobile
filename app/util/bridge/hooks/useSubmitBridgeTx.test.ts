import { renderHook } from '@testing-library/react-hooks';
import useSubmitBridgeTx from './useSubmitBridgeTx';
import useHandleBridgeTx from './useHandleBridgeTx';
import useHandleApprovalTx from './useHandleApprovalTx';
import { DummyQuotesNoApproval, DummyQuotesWithApproval } from '../../../test/data/bridge/dummy-quotes';
import { QuoteResponse } from '../../../components/UI/Bridge/types';

jest.mock('./useHandleBridgeTx');
jest.mock('./useHandleApprovalTx');

describe('useSubmitBridgeTx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHandleBridgeTx = jest.fn();
  const mockHandleApprovalTx = jest.fn();

  beforeAll(() => {
    (useHandleBridgeTx as jest.Mock).mockReturnValue({
      handleBridgeTx: mockHandleBridgeTx,
    });
    (useHandleApprovalTx as jest.Mock).mockReturnValue({
      handleApprovalTx: mockHandleApprovalTx,
    });
  });

  it('should handle bridge transaction without approval', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx());

    const mockQuoteResponse = DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0];

    mockHandleBridgeTx.mockResolvedValueOnce({ success: true });

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse,
    });

    expect(mockHandleApprovalTx).not.toHaveBeenCalled();
    expect(mockHandleBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuoteResponse,
      approvalTxId: undefined,
    });
    expect(txResult).toEqual({ success: true });
  });

  it('should handle bridge transaction with approval', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx());

    const mockQuoteResponse = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

    mockHandleApprovalTx.mockResolvedValueOnce({ id: '123' });
    mockHandleBridgeTx.mockResolvedValueOnce({ success: true });

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse,
    });

    expect(mockHandleApprovalTx).toHaveBeenCalledWith({
      approval: mockQuoteResponse.approval,
      quoteResponse: mockQuoteResponse,
    });
    expect(mockHandleBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuoteResponse,
      approvalTxId: '123',
    });
    expect(txResult).toEqual({ success: true });
  });

  it('should propagate errors from approval transaction', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx());

    const mockQuoteResponse = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

    const error = new Error('Approval failed');
    mockHandleApprovalTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as QuoteResponse,
      })
    ).rejects.toThrow('Approval failed');

    expect(mockHandleBridgeTx).not.toHaveBeenCalled();
  });

  it('should propagate errors from bridge transaction', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx());

    const mockQuoteResponse = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

    const error = new Error('Bridge transaction failed');
    mockHandleBridgeTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as QuoteResponse,
      })
    ).rejects.toThrow('Bridge transaction failed');
  });
});
