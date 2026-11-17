import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { updateTransactionGasFees } from '../../../../../../util/transaction-controller';
import { simpleSendTransaction } from '../../../__mocks__/controllers/transaction-controller-mock';
import { GasModalType } from '../../../constants/gas';
import { AdvancedGasPriceModal } from './advanced-gas-price-modal';

const mockPersistGasFeePreference = jest.fn();
const mockUseTransactionMetadataRequest = jest.fn();

jest.mock('../../../../../../util/transaction-controller');
jest.mock('../../../hooks/gas/usePersistGasFeePreference', () => ({
  usePersistGasFeePreference: jest.fn(() => mockPersistGasFeePreference),
}));
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: () => mockUseTransactionMetadataRequest(),
}));

describe('AdvancedGasPriceModal', () => {
  const mockUpdateTransactionGasFees = jest.mocked(updateTransactionGasFees);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(simpleSendTransaction);
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

  it('does not save when the gas price is missing', () => {
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

    expect(mockUpdateTransactionGasFees).not.toHaveBeenCalled();
    expect(mockPersistGasFeePreference).not.toHaveBeenCalled();
    expect(mockHandleCloseModals).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an upgraded-node estimate',
      '0x2ee0',
      simpleSendTransaction.networkClientId,
    ],
    ['a legacy-node estimate', '0x5208', simpleSendTransaction.networkClientId],
    ['no node estimate', undefined, simpleSendTransaction.networkClientId],
    ['a stale higher estimate after an RPC change', '0x664e', 'new-rpc'],
  ])(
    'saves a 12000 gas limit with %s',
    (_scenario, gasLimitNoBuffer, networkClientId) => {
      const transactionMeta = {
        ...simpleSendTransaction,
        gasLimitNoBuffer,
        networkClientId,
      };
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);
      const mockSetActiveModal = jest.fn();
      const mockHandleCloseModals = jest.fn();
      const { getByTestId } = render(
        <AdvancedGasPriceModal
          setActiveModal={mockSetActiveModal}
          handleCloseModals={mockHandleCloseModals}
        />,
      );

      fireEvent.changeText(getByTestId('gas-price-input'), '15');
      fireEvent.changeText(getByTestId('gas-input'), '12000');
      fireEvent.press(getByTestId('save-gas-price-button'));

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith(
        simpleSendTransaction.id,
        expect.objectContaining({
          gas: '0x2ee0',
          gasPrice: '0x37e11d600',
          userFeeLevel: 'custom',
        }),
      );
      expect(mockPersistGasFeePreference).toHaveBeenCalledWith(
        transactionMeta,
        {
          userFeeLevel: 'custom',
          gasPrice: '0x37e11d600',
        },
      );
    },
  );

  it('closes the sheet when the header close button is pressed', () => {
    const mockSetActiveModal = jest.fn();
    const mockHandleCloseModals = jest.fn();

    const { getByTestId } = render(
      <AdvancedGasPriceModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockSetActiveModal).toHaveBeenCalledWith(GasModalType.ESTIMATES);
  });
});
