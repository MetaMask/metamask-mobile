import { selectEvmChainId, selectIsEIP1559Network } from '../../../../selectors/networkController';
import { selectSwapsApprovalTransaction } from '../../../../reducers/swaps';
import { useSwapsSmartTransaction } from './useSwapsSmartTransaction';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import Engine from '../../../../core/Engine';
import { Quote } from '@metamask/swaps-controller/dist/types';
import {
  getGasIncludedTransactionFees,
  type GasIncludedQuote
} from '../../../../util/smart-transactions';

// Mock selectors directly
jest.mock('../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../selectors/networkController'),
  selectEvmChainId: jest.fn(),
  selectIsEIP1559Network: jest.fn(),
}));

jest.mock('../../../../reducers/swaps', () => ({
  ...jest.requireActual('../../../../reducers/swaps'),
  selectSwapsApprovalTransaction: jest.fn(),
}));

// Mock Engine and its methods properly with jest.fn()
jest.mock('../../../../core/Engine', () => ({
  context: {
    SmartTransactionsController: {
      getFees: jest.fn(),
      submitSignedTransactions: jest.fn(),
      updateSmartTransaction: jest.fn(),
    },
    TransactionController: {
      approveTransactionsWithSameNonce: jest.fn(),
    },
  },
}));

jest.mock('./gas', () => ({
  getGasFeeEstimatesForTransaction: jest.fn(() => Promise.resolve({
    maxFeePerGas: '0x1234',
    maxPriorityFeePerGas: '0x5678',
  })),
}));

// Mock the getGasIncludedTransactionFees function
jest.mock('../../../../util/smart-transactions', () => ({
  ...jest.requireActual('../../../../util/smart-transactions'),
  getGasIncludedTransactionFees: jest.fn(),
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
    (selectEvmChainId as unknown as jest.Mock).mockReturnValue(mockChainId);
    (selectIsEIP1559Network as unknown as jest.Mock).mockReturnValue(mockIsEIP1559Network);
    (selectSwapsApprovalTransaction as unknown as jest.Mock).mockReturnValue(null);

    // Setup controller mocks
    (Engine.context.SmartTransactionsController.getFees as jest.Mock).mockResolvedValue(mockSmartTransactionFees);
    (Engine.context.TransactionController.approveTransactionsWithSameNonce as jest.Mock).mockResolvedValue(['0xsignedtx1', '0xsignedtx2']);
  });

  it('should successfully submit a trade transaction without approval', async () => {
    // Mock no approval transaction
    (selectSwapsApprovalTransaction as unknown as jest.Mock).mockReturnValue(null);

    (Engine.context.SmartTransactionsController.submitSignedTransactions as jest.Mock).mockResolvedValueOnce(mockTradeResponse);

    const { result } = renderHookWithProvider(() =>
      useSwapsSmartTransaction({
        quote: {trade: mockTradeTransaction} as Quote,
        gasEstimates: mockGasEstimates
      })
    );

    const returnValue = await result.current.submitSwapsSmartTransaction();

    // Verify getFees was called with correct params
    expect(Engine.context.SmartTransactionsController.getFees).toHaveBeenCalledWith(
      mockTradeTransaction,
      null
    );

    // Verify approveTransactionsWithSameNonce was called
    expect(Engine.context.TransactionController.approveTransactionsWithSameNonce).toHaveBeenCalled();

    // Verify submitSignedTransactions was called
    expect(Engine.context.SmartTransactionsController.submitSignedTransactions).toHaveBeenCalledTimes(1);
    expect(Engine.context.SmartTransactionsController.submitSignedTransactions).toHaveBeenCalledWith({
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
    expect(Engine.context.SmartTransactionsController.updateSmartTransaction).toHaveBeenCalledWith({
      uuid: 'trade-uuid-456',
      origin: ORIGIN_METAMASK,
      type: TransactionType.swap,
      creationTime: 123,
    });

    // Verify the UUID was returned
    expect(returnValue).toEqual({
      approvalTxUuid: undefined,
      tradeTxUuid: 'trade-uuid-456',
    });
  });

  it('should successfully submit both approval and trade transactions', async () => {
    // Mock with approval transaction
    (selectSwapsApprovalTransaction as unknown as jest.Mock).mockReturnValue(mockApprovalTransaction);

    // Mock different UUIDs for approval and trade transactions
    (Engine.context.SmartTransactionsController.submitSignedTransactions as jest.Mock).mockResolvedValueOnce(mockApprovalResponse)
      .mockResolvedValueOnce(mockTradeResponse);

    const { result } = renderHookWithProvider(() =>
      useSwapsSmartTransaction({
        quote: {trade: mockTradeTransaction} as Quote,
        gasEstimates: mockGasEstimates
      })
    );

    const returnValue = await result.current.submitSwapsSmartTransaction();

    // Verify getFees was called with correct params
    expect(Engine.context.SmartTransactionsController.getFees).toHaveBeenCalledWith(
      mockTradeTransaction,
      mockApprovalTransaction
    );

    // Verify submitSignedTransactions was called twice (for approval and trade)
    expect(Engine.context.SmartTransactionsController.submitSignedTransactions).toHaveBeenCalledTimes(2);

    // Verify updateSmartTransaction was called for both transactions
    expect(Engine.context.SmartTransactionsController.updateSmartTransaction).toHaveBeenCalledTimes(2);
    expect(Engine.context.SmartTransactionsController.updateSmartTransaction).toHaveBeenCalledWith({
      uuid: 'approval-uuid-123',
      origin: ORIGIN_METAMASK,
      type: TransactionType.swapApproval,
      creationTime: expect.any(Number),
    });
    expect(Engine.context.SmartTransactionsController.updateSmartTransaction).toHaveBeenCalledWith({
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

  it('should use gas-included transaction fees when quote has isGasIncludedTrade flag', async () => {
    (selectSwapsApprovalTransaction as unknown as jest.Mock).mockReturnValue(null);
    const mockGasIncludedQuote = {
      trade: mockTradeTransaction,
      isGasIncludedTrade: true,
    } as unknown as Quote & Partial<GasIncludedQuote>;
    const mockGasIncludedFees = {
      tradeTxFees: {
        gasLimit: '120000',
        fees: [
          { maxFeePerGas: '55', maxPriorityFeePerGas: '3' },
          { maxFeePerGas: '65', maxPriorityFeePerGas: '4' },
        ],
        cancelFees: [],
      },
      approvalTxFees: null,
    };
    (getGasIncludedTransactionFees as jest.Mock).mockReturnValue(mockGasIncludedFees);
    (Engine.context.SmartTransactionsController.submitSignedTransactions as jest.Mock).mockResolvedValueOnce(mockTradeResponse);

    const { result } = renderHookWithProvider(() =>
      useSwapsSmartTransaction({
        quote: mockGasIncludedQuote,
        gasEstimates: mockGasEstimates
      })
    );
    const returnValue = await result.current.submitSwapsSmartTransaction();

    expect(getGasIncludedTransactionFees).toHaveBeenCalledWith(mockGasIncludedQuote);
    expect(Engine.context.SmartTransactionsController.getFees).not.toHaveBeenCalled();
    expect(Engine.context.TransactionController.approveTransactionsWithSameNonce).toHaveBeenCalled();
    expect(Engine.context.SmartTransactionsController.submitSignedTransactions).toHaveBeenCalledTimes(1);
    expect(Engine.context.SmartTransactionsController.submitSignedTransactions).toHaveBeenCalledWith({
      signedTransactions: ['0xsignedtx1', '0xsignedtx2'],
      txParams: expect.objectContaining({
        chainId: mockChainId,
        from: '0xfrom',
        to: '0xto',
        data: '0xdata',
        value: '0x0',
        gas: '1d4c0',
        maxFeePerGas: '0x1234',
        maxPriorityFeePerGas: '0x5678',
      }),
      signedCanceledTransactions: [],
    });
    expect(Engine.context.SmartTransactionsController.updateSmartTransaction).toHaveBeenCalledWith({
      uuid: 'trade-uuid-456',
      origin: ORIGIN_METAMASK,
      type: TransactionType.swap,
      creationTime: expect.any(Number),
    });
    expect(returnValue).toEqual({
      approvalTxUuid: undefined,
      tradeTxUuid: 'trade-uuid-456',
    });
  });
});
