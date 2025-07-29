import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';

import { updateTransactionGasFees } from '../../../../../../util/transaction-controller';
import { simpleSendTransaction } from '../../../__mocks__/controllers/transaction-controller-mock';
import { GasModalType } from '../../../constants/gas';
import { AdvancedEIP1559Modal } from './advanced-eip1559-modal';

jest.mock('../../../../../../util/transaction-controller');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => {
  const { simpleSendTransaction: actualSimpleSendTransaction } =
    jest.requireActual(
      '../../../__mocks__/controllers/transaction-controller-mock',
    );
  return {
    useTransactionMetadataRequest: jest.fn(() => actualSimpleSendTransaction),
  };
});

jest.mock('../../../hooks/gas/useGasFeeEstimates', () => {
  const { feeMarketEstimates } = jest.requireActual(
    '../../../__mocks__/controllers/gas-fee-controller-mock',
  );
  return {
    useGasFeeEstimates: jest.fn(() => ({
      gasFeeEstimates: feeMarketEstimates as GasFeeEstimates,
    })),
  };
});

describe('AdvancedEIP1559Modal', () => {
  const mockUpdateTransactionGasFees = jest.mocked(updateTransactionGasFees);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the input fields', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedEIP1559Modal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    expect(getByTestId('gas-input')).toBeOnTheScreen();
    expect(getByTestId('max-base-fee-input')).toBeOnTheScreen();
    expect(getByTestId('priority-fee-input')).toBeOnTheScreen();
  });

  it('calls updateTransactionGasFees when the save button is pressed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByText } = render(
      <AdvancedEIP1559Modal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledTimes(1);
    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith(
      simpleSendTransaction.id,
      expect.objectContaining({
        userFeeLevel: 'custom',
      }),
    );
    expect(mockHandleCloseModals).toHaveBeenCalledTimes(1);
  });

  it('calls updateTransactionGasFees with correct values when all fields are changed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId, getByText } = render(
      <AdvancedEIP1559Modal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const maxBaseFeeInput = getByTestId('max-base-fee-input');
    fireEvent.changeText(maxBaseFeeInput, '100');

    const priorityFeeInput = getByTestId('priority-fee-input');
    fireEvent.changeText(priorityFeeInput, '5');

    const gasLimitInput = getByTestId('gas-input');
    fireEvent.changeText(gasLimitInput, '21000');

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith(
      simpleSendTransaction.id,
      expect.objectContaining({
        gas: '0x5208',
        maxFeePerGas: '0x174876e800',
        maxPriorityFeePerGas: '0x12a05f200',
        userFeeLevel: 'custom',
      }),
    );
  });

  it('calls navigateToEstimatesModal when the back button is pressed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedEIP1559Modal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockSetActiveModal).toHaveBeenCalledWith(GasModalType.ESTIMATES);
  });
});
