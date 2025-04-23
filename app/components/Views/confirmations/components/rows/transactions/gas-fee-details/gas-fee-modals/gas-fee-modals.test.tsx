import { isEIP1559Transaction } from '@metamask/transaction-controller';
import { act } from '@testing-library/react-native';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { stakingDepositConfirmationState } from '../../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { updateTransactionGasFees } from '../../../../../../../../util/transaction-controller';
import UpdateEIP1559Tx from '../../../../../legacy/components/UpdateEIP1559Tx';
import GasFeeModals from './gas-fee-modals';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));
jest.mock('@metamask/transaction-controller');
jest.mock('../../../../../../../../util/transaction-controller', () => ({
  updateTransactionGasFees: jest.fn().mockResolvedValue(true),
}));
const mockOnSaveFn = jest.fn();
const mockOnCancelFn = jest.fn();
jest.mock('../../../../../legacy/components/UpdateEIP1559Tx', () =>
  jest.fn(props => {
    mockOnSaveFn.mockImplementation(props.onSave);
    mockOnCancelFn.mockImplementation(props.onCancel);
    return null;
  }),
);

describe('GasFeeModals', () => {
  const baseTxParams = stakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].txParams;
  const baseTxId = '699ca2f0-e459-11ef-b6f6-d182277cf5e1'; // Use existing ID from approval controller

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSaveFn.mockReset();
    mockOnCancelFn.mockReset();
    (isEIP1559Transaction as jest.Mock).mockReturnValue(true);
  });

  const createTestState = (txParamsOverrides = {}, txId = baseTxId) => {
    const state = cloneDeep(stakingDepositConfirmationState);
    state.engine.backgroundState.TransactionController.transactions = [{
      ...state.engine.backgroundState.TransactionController.transactions[0],
      id: txId,
      txParams: {
        ...baseTxParams,
        gas: '0x5208',
        ...txParamsOverrides,
      },
    }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approvals = state.engine.backgroundState.ApprovalController.pendingApprovals as Record<string, any>;
    const originalApprovalKey = Object.keys(approvals)[0];
    if (originalApprovalKey !== txId) {
      approvals[txId] = approvals[originalApprovalKey];
      delete approvals[originalApprovalKey];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state.engine.backgroundState.ApprovalController.pendingApprovals as Record<string, any>)[txId].requestData.txId = txId;
    return state;
  };

  it('should render UpdateEIP1559Tx with correct props for EIP1559 transaction when open', () => {
    const gasValue = '0x5208';
    const testState = createTestState({ gas: gasValue });

    renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={() => null} />,
      { state: testState },
    );

    expect(UpdateEIP1559Tx).toHaveBeenCalledTimes(1);

    expect(UpdateEIP1559Tx).toHaveBeenCalledWith(
      expect.objectContaining({
        gas: gasValue,
        existingGas: gasValue,
        isCancel: false,
        dappSuggestedGas: true,
        dontIgnoreOptions: true,
        defaultStopUpdateGas: true,
        isRedesignedTransaction: true,
      }),
      {},
    );
    expect(UpdateEIP1559Tx).toHaveBeenCalledWith(
      expect.objectContaining({
        onSave: expect.any(Function),
        onCancel: expect.any(Function),
      }),
      {},
    );
  });

  it('should return null for non-EIP1559 transaction', () => {
    const testState = createTestState();
    (isEIP1559Transaction as jest.Mock).mockReturnValue(false);

    renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={() => null} />,
      { state: testState },
    );

    expect(UpdateEIP1559Tx).not.toHaveBeenCalled();
  });

  it('should update transaction gas fees on save', async () => {
    const testState = createTestState();
    const setGasModalIsOpen = jest.fn();

    renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={setGasModalIsOpen} />,
      { state: testState },
    );

    expect(UpdateEIP1559Tx).toHaveBeenCalled();
    expect(mockOnSaveFn).toBeDefined();

    const saveData = {
      userFeeLevel: 'custom',
      suggestedGasLimit: '21000',
      suggestedMaxFeePerGas: '50',
      suggestedMaxPriorityFeePerGas: '2',
    };
    await act(async () => {
      mockOnSaveFn(saveData);
    });

    expect(updateTransactionGasFees).toHaveBeenCalledWith(baseTxId, {
      gasLimit: '0x5208',
      maxFeePerGas: '0xba43b7400',
      maxPriorityFeePerGas: '0x77359400',
      userFeeLevel: 'custom',
    });
    expect(setGasModalIsOpen).toHaveBeenCalledWith(false);
  });

  it('should close modal on cancel', () => {
    const testState = createTestState();
    const setGasModalIsOpen = jest.fn();

    renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={setGasModalIsOpen} />,
      { state: testState },
    );

    expect(UpdateEIP1559Tx).toHaveBeenCalled();
    expect(mockOnCancelFn).toBeDefined();

    act(() => {
      mockOnCancelFn();
    });

    expect(setGasModalIsOpen).toHaveBeenCalledWith(false);
    expect(updateTransactionGasFees).not.toHaveBeenCalled();
  });

  it('should pass different transaction metadata correctly', () => {
    const txParams = {
      gas: '0x7530',
      maxFeePerGas: '0x5208',
      maxPriorityFeePerGas: '0x1',
    };
    const testState = createTestState(txParams);

    renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={() => null} />,
      { state: testState },
    );

    expect(UpdateEIP1559Tx).toHaveBeenCalledTimes(1);
    expect(UpdateEIP1559Tx).toHaveBeenCalledWith(
      expect.objectContaining({
        gas: txParams.gas,
        existingGas: txParams.gas,
        isCancel: false,
        dappSuggestedGas: true,
        dontIgnoreOptions: true,
        defaultStopUpdateGas: true,
        isRedesignedTransaction: true,
        onSave: expect.any(Function),
        onCancel: expect.any(Function),
      }),
      {},
    );
  });

  it('should render UpdateEIP1559Tx when modal is open and not render when closed', () => {
    const testState = createTestState();
    const setGasModalIsOpen = jest.fn();

    const { rerender } = renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={setGasModalIsOpen} />,
      { state: testState },
    );

    expect(UpdateEIP1559Tx).toHaveBeenCalledTimes(1);

    (UpdateEIP1559Tx as unknown as jest.Mock).mockClear();

    rerender(
      <GasFeeModals gasModalIsOpen={false} setGasModalIsOpen={setGasModalIsOpen} />,
    );

    expect(UpdateEIP1559Tx).toHaveBeenCalledTimes(1);
  });
});
