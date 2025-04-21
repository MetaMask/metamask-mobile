import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import useHandleApprovalTx, { APPROVAL_TX_ERROR } from './useHandleApprovalTx';
import { DummyQuotesWithApproval } from '../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import {
  isEthUsdt,
  getEthUsdtResetData,
  FeeType,
} from '@metamask/bridge-controller';

// Mock the useHandleTx hook
const mockHandleTx = jest.fn();
jest.mock('./useHandleTx', () => ({
  __esModule: true,
  default: () => ({
    handleTx: mockHandleTx,
  }),
}));

// Mock the Engine context
const mockGetBridgeERC20Allowance = jest.fn();
jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        getBridgeERC20Allowance: (...args: [string, string, string]) =>
          mockGetBridgeERC20Allowance(...args),
      },
    },
  },
}));

// Mock the bridge controller utilities
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isEthUsdt: jest.fn(),
  getEthUsdtResetData: jest.fn(),
  FeeType: {
    METABRIDGE: 'METABRIDGE',
  },
}));

describe('useHandleApprovalTx', () => {
  const mockQuote = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0];

  beforeEach(() => {
    jest.clearAllMocks();
    (isEthUsdt as jest.Mock).mockReturnValue(false);
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

  describe('ETH USDT handling', () => {
    beforeEach(() => {
      (isEthUsdt as jest.Mock).mockReturnValue(true);
      mockQuote.quote.feeData = {
        [FeeType.METABRIDGE]: {
          amount: '1000000',
          asset: mockQuote.quote.srcAsset,
        },
      };
      (getEthUsdtResetData as jest.Mock).mockReturnValue('0xresetdata');
    });

    it('should reset allowance before approval if current allowance is non-zero but insufficient', async () => {
      const mockTxMeta = { id: '123', status: 'submitted' };
      mockHandleTx
        .mockResolvedValueOnce({ id: 'reset' })
        .mockResolvedValueOnce(mockTxMeta);
      mockGetBridgeERC20Allowance.mockResolvedValueOnce('500000'); // Lower than required amount

      const { result } = renderHook(() => useHandleApprovalTx());

      const txMeta = await result.current.handleApprovalTx({
        approval: mockQuote.approval,
        quoteResponse: mockQuote as QuoteResponse,
      });

      // Verify reset transaction
      expect(mockHandleTx).toHaveBeenNthCalledWith(1, {
        txType: TransactionType.bridgeApproval,
        txParams: {
          ...mockQuote.approval,
          data: '0xresetdata',
        },
        fieldsToAddToTxMeta: {
          sourceTokenSymbol: mockQuote.quote.srcAsset.symbol,
        },
      });

      // Verify approval transaction
      expect(mockHandleTx).toHaveBeenNthCalledWith(2, {
        txType: TransactionType.bridgeApproval,
        txParams: mockQuote.approval,
        fieldsToAddToTxMeta: {
          sourceTokenSymbol: mockQuote.quote.srcAsset.symbol,
        },
      });
      expect(txMeta).toBe(mockTxMeta);
    });

    it('should skip reset if current allowance is zero', async () => {
      const mockTxMeta = { id: '123', status: 'submitted' };
      mockHandleTx.mockResolvedValueOnce(mockTxMeta);
      mockGetBridgeERC20Allowance.mockResolvedValueOnce('0');

      const { result } = renderHook(() => useHandleApprovalTx());

      const txMeta = await result.current.handleApprovalTx({
        approval: mockQuote.approval,
        quoteResponse: mockQuote as QuoteResponse,
      });

      expect(mockHandleTx).toHaveBeenCalledTimes(1);
      expect(mockHandleTx).toHaveBeenCalledWith({
        txType: TransactionType.bridgeApproval,
        txParams: mockQuote.approval,
        fieldsToAddToTxMeta: {
          sourceTokenSymbol: mockQuote.quote.srcAsset.symbol,
        },
      });
      expect(txMeta).toBe(mockTxMeta);
    });

    it('should throw error when allowance reset fails', async () => {
      const mockError = new Error('Reset failed');
      mockGetBridgeERC20Allowance.mockResolvedValueOnce('500000');
      mockHandleTx.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useHandleApprovalTx());

      await expect(
        result.current.handleApprovalTx({
          approval: mockQuote.approval,
          quoteResponse: mockQuote as QuoteResponse,
        }),
      ).rejects.toThrow(
        `${APPROVAL_TX_ERROR}: Error: Eth USDT allowance reset failed: ${mockError}`,
      );
    });
  });
});
