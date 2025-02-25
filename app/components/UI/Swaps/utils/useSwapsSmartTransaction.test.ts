import { renderHook, act } from '@testing-library/react-hooks';
import { selectEvmChainId, selectIsEIP1559Network } from '../../../../selectors/networkController';
import { selectSwapsApprovalTransaction } from '../../../../reducers/swaps';
import { useSwapsSmartTransaction } from './useSwapsSmartTransaction';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

// Mock selectors directly
jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
  selectIsEIP1559Network: jest.fn(),
}));

jest.mock('../../../../reducers/swaps', () => ({
  selectSwapsApprovalTransaction: jest.fn(),
}));

// Mock Engine and its methods properly with jest.fn()
const mockGetFees = jest.fn();
const mockSubmitSignedTransactions = jest.fn();
const mockUpdateSmartTransaction = jest.fn();
const mockApproveTransactionsWithSameNonce = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    SmartTransactionsController: {
      getFees: mockGetFees,
      submitSignedTransactions: mockSubmitSignedTransactions,
      updateSmartTransaction: mockUpdateSmartTransaction,
    },
    TransactionController: {
      approveTransactionsWithSameNonce: mockApproveTransactionsWithSameNonce,
    },
  },
}));

jest.mock('./gas', () => ({
  getGasFeeEstimatesForTransaction: jest.fn(() => Promise.resolve({
    maxFeePerGas: '0x1234',
    maxPriorityFeePerGas: '0x5678',
  })),
}));

describe('useSwapsSmartTransaction', () => {
  const mockChainId = '0x1';
  const mockIsEIP1559Network = true;
  const mockGasEstimates = {
    gasPrice: '20',
    medium: '50',
  };

  const mockTradeTransaction = {
    from: '0xfrom',
    to: '0xto',
    data: '0xdata',
    value: '0x0',
    gas: '0x5208',
  };

  const mockApprovalTransaction = {
    from: '0xfrom',
    to: '0xtoken',
    data: '0xapprovedata',
    gas: '0x5208',
  };

  const mockSmartTransactionFees = {
    tradeTxFees: {
      gasLimit: '100000',
      fees: [
        { maxFeePerGas: '50', maxPriorityFeePerGas: '2' },
        { maxFeePerGas: '60', maxPriorityFeePerGas: '3' },
      ],
      cancelFees: [
        { maxFeePerGas: '70', maxPriorityFeePerGas: '4' },
        { maxFeePerGas: '80', maxPriorityFeePerGas: '5' },
      ],
    },
    approvalTxFees: {
      gasLimit: '80000',
      fees: [
        { maxFeePerGas: '40', maxPriorityFeePerGas: '1' },
        { maxFeePerGas: '50', maxPriorityFeePerGas: '2' },
      ],
      cancelFees: [
        { maxFeePerGas: '60', maxPriorityFeePerGas: '3' },
        { maxFeePerGas: '70', maxPriorityFeePerGas: '4' },
      ],
    },
  };

  const mockApprovalResponse = { uuid: 'approval-uuid-123' };
  const mockTradeResponse = { uuid: 'trade-uuid-456' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup selector default return values
    (selectEvmChainId as jest.Mock).mockReturnValue(mockChainId);
    (selectIsEIP1559Network as jest.Mock).mockReturnValue(mockIsEIP1559Network);
    (selectSwapsApprovalTransaction as jest.Mock).mockReturnValue(null);

    // Setup controller mocks
    mockGetFees.mockResolvedValue(mockSmartTransactionFees);
    mockSubmitSignedTransactions.mockResolvedValue(mockTradeResponse);
    mockUpdateSmartTransaction.mockResolvedValue(undefined);
    mockApproveTransactionsWithSameNonce.mockResolvedValue(['0xsignedtx1', '0xsignedtx2']);
  });

  it('should successfully submit a trade transaction without approval', async () => {
    // Mock no approval transaction
    (selectSwapsApprovalTransaction as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useSwapsSmartTransaction({
        tradeTransaction: mockTradeTransaction,
        gasEstimates: mockGasEstimates
      })
    );

    let returnValue;
    await act(async () => {
      returnValue = await result.current.submitSwapsSmartTransaction();
    });

    // Verify getFees was called with correct params
    expect(mockGetFees).toHaveBeenCalledWith(
      mockTradeTransaction,
      null
    );

    // Verify approveTransactionsWithSameNonce was called
    expect(mockApproveTransactionsWithSameNonce).toHaveBeenCalled();

    // Verify submitSignedTransactions was called
    expect(mockSubmitSignedTransactions).toHaveBeenCalledWith({
      signedTransactions: ['0xsignedtx1', '0xsignedtx2'],
      txParams: expect.objectContaining({
        from: '0xfrom',
        to: '0xto',
        data: '0xdata',
        value: '0x0',
        // Additional properties from gasFeeEstimates
        maxFeePerGas: '0x1234',
        maxPriorityFeePerGas: '0x5678',
      }),
      signedCanceledTransactions: [],
    });

    // Verify updateSmartTransaction was called for the trade transaction
    expect(mockUpdateSmartTransaction).toHaveBeenCalledWith({
      uuid: 'trade-uuid-456',
      origin: ORIGIN_METAMASK,
      type: TransactionType.swap,
      creationTime: expect.any(Number),
    });

    // Verify the UUID was returned
    expect(returnValue).toEqual({
      approvalTxUuid: undefined,
      tradeTxUuid: 'trade-uuid-456',
    });
  });

  it('should successfully submit both approval and trade transactions', async () => {
    // Mock with approval transaction
    (selectSwapsApprovalTransaction as jest.Mock).mockReturnValue(mockApprovalTransaction);

    // Mock different UUIDs for approval and trade transactions
    mockSubmitSignedTransactions
      .mockResolvedValueOnce(mockApprovalResponse)
      .mockResolvedValueOnce(mockTradeResponse);

    const { result } = renderHook(() =>
      useSwapsSmartTransaction({
        tradeTransaction: mockTradeTransaction,
        gasEstimates: mockGasEstimates
      })
    );

    let returnValue;
    await act(async () => {
      returnValue = await result.current.submitSwapsSmartTransaction();
    });

    // Verify getFees was called with correct params
    expect(mockGetFees).toHaveBeenCalledWith(
      mockTradeTransaction,
      mockApprovalTransaction
    );

    // Verify submitSignedTransactions was called twice (for approval and trade)
    expect(mockSubmitSignedTransactions).toHaveBeenCalledTimes(2);

    // Verify updateSmartTransaction was called for both transactions
    expect(mockUpdateSmartTransaction).toHaveBeenCalledTimes(2);
    expect(mockUpdateSmartTransaction).toHaveBeenCalledWith({
      uuid: 'approval-uuid-123',
      origin: ORIGIN_METAMASK,
      type: TransactionType.swapApproval,
      creationTime: expect.any(Number),
    });
    expect(mockUpdateSmartTransaction).toHaveBeenCalledWith({
      uuid: 'trade-uuid-456',
      origin: ORIGIN_METAMASK,
      type: TransactionType.swap,
      creationTime: expect.any(Number),
    });

    // Verify both UUIDs were returned
    expect(returnValue).toEqual({
      approvalTxUuid: 'approval-uuid-123',
      tradeTxUuid: 'trade-uuid-456',
    });
  });
});
