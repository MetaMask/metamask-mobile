import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { EstimatesModal } from './estimates-modal';
import { useGasOptions } from '../../../hooks/gas/useGasOptions';

jest.mock('../../../hooks/gas/useGasOptions', () => ({
  useGasOptions: jest.fn(() => {
    const { noop } = jest.requireActual('lodash');
    return {
      options: [
        {
          estimatedTime: '',
          isSelected: false,
          key: 'fast',
          name: 'Test gas option',
          onSelect: noop,
          value: '< 0.0001',
          valueInFiat: '0.05',
        },
      ],
    };
  }),
}));

describe('EstimatesModal', () => {
  const mockSetActiveModal = jest.fn();
  const mockHandleCloseModals = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the gas option', () => {
    const { getByText, getByTestId } = render(
      <EstimatesModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    expect(useGasOptions).toHaveBeenCalledWith({
      setActiveModal: mockSetActiveModal,
      handleCloseModals: mockHandleCloseModals,
    });

    // Header
    expect(getByText('Edit network fee')).toBeOnTheScreen();

    expect(getByTestId('gas-option-fast')).toBeOnTheScreen();
    expect(getByText('Test gas option')).toBeOnTheScreen();
    expect(getByText('< 0.0001')).toBeOnTheScreen();
    expect(getByText('0.05')).toBeOnTheScreen();
  });

  it('closes the sheet when the header close button is pressed', () => {
    const { getByTestId } = render(
      <EstimatesModal
        setActiveModal={mockSetActiveModal}
        handleCloseModals={mockHandleCloseModals}
      />,
    );

    fireEvent.press(getByTestId('button-icon'));

    expect(mockHandleCloseModals).toHaveBeenCalled();
  });
});
