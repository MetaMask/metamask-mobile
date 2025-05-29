import { render } from '@testing-library/react-native';
import React from 'react';

import { GasFeeModal } from './gas-fee-modal';
import { EstimatesModal } from '../estimates-modal';
import { AdvancedEIP1559Modal } from '../advanced-eip1559-modal';
import { AdvancedGasPriceModal } from '../advanced-gas-price-modal';
import { GasModalType } from '../../../constants/gas';

jest.mock('../advanced-gas-price-modal', () => ({
  AdvancedGasPriceModal: jest.fn(() => null),
}));

jest.mock('../advanced-eip1559-modal', () => ({
  AdvancedEIP1559Modal: jest.fn(() => null),
}));

jest.mock('../estimates-modal', () => ({
  EstimatesModal: jest.fn(() => null),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));

describe('GasFeeModal', () => {
  const mockEstimatesModal = EstimatesModal as jest.MockedFunction<
    typeof EstimatesModal
  >;
  const mockAdvancedEIP1559Modal = AdvancedEIP1559Modal as jest.MockedFunction<
    typeof AdvancedEIP1559Modal
  >;
  const mockAdvancedGasPriceModal =
    AdvancedGasPriceModal as jest.MockedFunction<typeof AdvancedGasPriceModal>;

  const mockSetState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders EstimatesModal initially', () => {
    (React.useState as jest.Mock).mockReturnValue([
      GasModalType.ESTIMATES,
      mockSetState,
    ]);

    const setGasModalVisible = jest.fn();
    render(<GasFeeModal setGasModalVisible={setGasModalVisible} />);

    expect(mockEstimatesModal).toHaveBeenCalled();
    expect(mockEstimatesModal.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        setActiveModal: expect.any(Function),
        handleCloseModals: expect.any(Function),
      }),
    );
  });

  it('renders AdvancedEIP1559Modal when activeModal is ADVANCED_EIP1559', () => {
    (React.useState as jest.Mock).mockReturnValue([
      GasModalType.ADVANCED_EIP1559,
      mockSetState,
    ]);

    const setGasModalVisible = jest.fn();
    render(<GasFeeModal setGasModalVisible={setGasModalVisible} />);

    expect(mockAdvancedEIP1559Modal).toHaveBeenCalled();
    expect(mockAdvancedEIP1559Modal.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        setActiveModal: expect.any(Function),
        handleCloseModals: expect.any(Function),
      }),
    );
  });

  it('renders AdvancedGasPriceModal when activeModal is ADVANCED_GAS_PRICE', () => {
    (React.useState as jest.Mock).mockReturnValue([
      GasModalType.ADVANCED_GAS_PRICE,
      mockSetState,
    ]);

    const setGasModalVisible = jest.fn();
    render(<GasFeeModal setGasModalVisible={setGasModalVisible} />);

    expect(mockAdvancedGasPriceModal).toHaveBeenCalled();
    expect(mockAdvancedGasPriceModal.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        setActiveModal: expect.any(Function),
        handleCloseModals: expect.any(Function),
      }),
    );
  });

  it('closes modals when handleCloseModals is called', () => {
    (React.useState as jest.Mock).mockReturnValue([
      GasModalType.ESTIMATES,
      mockSetState,
    ]);

    const setGasModalVisible = jest.fn();
    render(<GasFeeModal setGasModalVisible={setGasModalVisible} />);

    const handleCloseModals =
      mockEstimatesModal.mock.calls[0][0].handleCloseModals;

    handleCloseModals();

    expect(setGasModalVisible).toHaveBeenCalledWith(false);
  });
});
