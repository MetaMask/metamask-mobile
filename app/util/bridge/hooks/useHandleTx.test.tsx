import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import useHandleTx from './useHandleTx';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import {
  addTransaction,
  updateTransaction,
} from '../../transaction-controller';
import { resetTransaction } from '../../../actions/transaction';
import { DummyQuotesWithApproval } from '../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';
import { getTransaction1559GasFeeEstimates } from '../../../components/UI/Swaps/utils/gas';

const mockNetworkClientId = 'testNetworkClientId';
const mockChainId = '0x1';
const mockTxParams = DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0].trade;
const mockGasEstimates = {
  baseFeeTrend: 'up' as const,
  estimatedBaseFee: '0.70271601',
  high: {
    maxWaitTimeEstimate: 30000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '3.616246823',
    suggestedMaxPriorityFeePerGas: '2',
  },
  medium: {
    maxWaitTimeEstimate: 45000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '1.504883895',
    suggestedMaxPriorityFeePerGas: '0.5',
  },
  low: {
    maxWaitTimeEstimate: 60000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '0.715662921',
    suggestedMaxPriorityFeePerGas: '0.012946911',
  },
  networkCongestion: 0.51605,
  priorityFeeTrend: 'down' as const,
  historicalBaseFeeRange: ['0.553548688', '0.9957375'] as [string, string],
  latestPriorityFeeRange: ['0.006886655', '3.093944657'] as [string, string],
  historicalPriorityFeeRange: ['0.000080453', '194.293042042'] as [
    string,
    string,
  ],
};

jest.mock('../../transaction-controller');
jest.mock('../../../actions/transaction');

jest.mock('../../../selectors/confirmTransaction', () => {
  const original = jest.requireActual('../../../selectors/confirmTransaction');
  return {
    ...original,
    selectGasFeeEstimates: () => mockGasEstimates,
  };
});

jest.mock('../../../selectors/networkController', () => {
  const original = jest.requireActual('../../../selectors/networkController');
  return {
    ...original,
    selectIsEIP1559Network: () => true,
    selectSelectedNetworkClientId: () => mockNetworkClientId,
    selectChainId: () => mockChainId,
  };
});

jest.mock('../../../components/UI/Swaps/utils/gas', () => ({
  getTransaction1559GasFeeEstimates: jest.fn(),
}));

describe('useHandleTx', () => {
  // Create a mock store
  const mockStore = configureMockStore();

  // Wrapper component with Provider
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={mockStore()}>{children}</Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Add consistent mock implementation
    (addTransaction as jest.Mock).mockResolvedValue({
      transactionMeta: { hash: '0x789' },
    });
  });

  it('should handle legacy transaction correctly', async () => {
    const mockTransactionMeta = { hash: '0x789' };
    (addTransaction as jest.Mock).mockResolvedValueOnce({
      transactionMeta: mockTransactionMeta,
    });

    const { result } = renderHook(() => useHandleTx(), { wrapper });

    const fieldsToAddToTxMeta = { id: '123' };
    const response = await result.current.handleTx({
      txType: TransactionType.bridge,
      txParams: mockTxParams,
      fieldsToAddToTxMeta,
    });

    expect(resetTransaction).toHaveBeenCalled();
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockTxParams,
        chainId: mockTxParams.chainId.toString(),
        gasLimit: expect.any(String),
        gas: expect.any(String),
      }),
      expect.objectContaining({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: mockNetworkClientId,
        origin: process.env.MM_FOX_CODE,
        requireApproval: false,
        type: TransactionType.bridge,
      }),
    );
    expect(updateTransaction).toHaveBeenCalledWith(
      { ...mockTransactionMeta, ...fieldsToAddToTxMeta },
      '',
    );
    expect(response).toBe(mockTransactionMeta);
  });

  it('should handle EIP1559 transaction correctly', async () => {
    const mockTransactionMeta = { hash: '0x789' };
    const mockEIP1559Estimates = {
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
    };

    (getTransaction1559GasFeeEstimates as jest.Mock).mockResolvedValue(
      mockEIP1559Estimates,
    );
    (addTransaction as jest.Mock).mockResolvedValue({
      transactionMeta: mockTransactionMeta,
    });

    const { result } = renderHook(() => useHandleTx(), { wrapper });

    await result.current.handleTx({
      txType: TransactionType.bridge,
      txParams: mockTxParams,
      fieldsToAddToTxMeta: {},
    });

    // Verify gas estimates call
    expect(getTransaction1559GasFeeEstimates).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockTxParams,
        chainId: mockTxParams.chainId.toString(),
        gasLimit: mockTxParams.gasLimit?.toString(),
      }),
      mockChainId,
    );

    // Verify transaction submission
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockTxParams,
        chainId: mockTxParams.chainId.toString(),
        gas: expect.any(String),
        gasLimit: expect.any(String),
        ...mockEIP1559Estimates,
      }),
      expect.objectContaining({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: mockNetworkClientId,
        origin: process.env.MM_FOX_CODE,
        requireApproval: false,
        type: TransactionType.bridge,
      }),
    );
  });

  it('should handle bridge approval transaction type', async () => {
    const mockTransactionMeta = { hash: '0x789' };
    (addTransaction as jest.Mock).mockResolvedValueOnce({
      transactionMeta: mockTransactionMeta,
    });

    const { result } = renderHook(() => useHandleTx(), { wrapper });

    const response = await result.current.handleTx({
      txType: TransactionType.bridgeApproval,
      txParams: mockTxParams,
      fieldsToAddToTxMeta: {},
    });

    expect(addTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: TransactionType.bridgeApproval,
      }),
    );

    expect(response).toBe(mockTransactionMeta);
  });

  it('should handle transaction with undefined gasLimit', async () => {
    const txParamsWithoutGasLimit = {
      ...mockTxParams,
      gasLimit: null,
    };

    const mockTransactionMeta = { hash: '0x789' };
    (addTransaction as jest.Mock).mockResolvedValueOnce({
      transactionMeta: mockTransactionMeta,
    });

    const { result } = renderHook(() => useHandleTx(), { wrapper });

    const response = await result.current.handleTx({
      txType: TransactionType.bridge,
      txParams: txParamsWithoutGasLimit,
      fieldsToAddToTxMeta: {},
    });

    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        gasLimit: '0x0',
        gas: '0x0',
      }),
      expect.any(Object),
    );

    expect(response).toBe(mockTransactionMeta);
  });
});
