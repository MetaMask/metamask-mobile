import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { updateTransactionGasFees } from '../../../../../../util/transaction-controller';
import { simpleSendTransaction } from '../../../__mocks__/controllers/transaction-controller-mock';
import { GasModalType } from '../../../constants/gas';
import { AdvancedGasPriceModal } from './advanced-gas-price-modal';

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

describe('AdvancedGasPriceModal', () => {
  const mockUpdateTransactionGasFees = jest.mocked(updateTransactionGasFees);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the input fields', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedGasPriceModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    expect(getByTestId('gas-price-input')).toBeOnTheScreen();
    expect(getByTestId('gas-input')).toBeOnTheScreen();
  });

  it('calls updateTransactionGasFees when the save button is pressed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedGasPriceModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const saveButton = getByTestId('save-gas-price-button');
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

  it('calls updateTransactionGasFees with correct values when gas price and gas limit are changed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedGasPriceModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const gasPriceInput = getByTestId('gas-price-input');
    fireEvent.changeText(gasPriceInput, '15');

    const gasLimitInput = getByTestId('gas-input');
    fireEvent.changeText(gasLimitInput, '21000');

    const saveButton = getByTestId('save-gas-price-button');
    fireEvent.press(saveButton);

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith(
      simpleSendTransaction.id,
      expect.objectContaining({
        gas: '0x5208',
        gasPrice: '0x37e11d600',
        userFeeLevel: 'custom',
      }),
    );
  });

  it('calls navigateToEstimatesModal when the back button is pressed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedGasPriceModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockSetActiveModal).toHaveBeenCalledWith(GasModalType.ESTIMATES);
  });
});
