import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';
import { GasOption } from './gas-option';

const mockGasOption = {
  estimatedTime: '',
  isSelected: false,
  key: 'fast',
  name: 'Test gas option',
  onSelect: noop,
  value: '< 0.0001',
  valueInFiat: '0.05',
};

describe('GasOption', () => {
  it('renders the gas option', () => {
    const { getByText, getByTestId } = render(
      <GasOption option={mockGasOption} />,
    );

    expect(getByTestId('gas-option-fast')).toBeOnTheScreen();
    expect(getByText('Test gas option')).toBeOnTheScreen();
    expect(getByText('< 0.0001')).toBeOnTheScreen();
    expect(getByText('0.05')).toBeOnTheScreen();
  });

  it('calls onSelect when the gas option is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <GasOption option={{ ...mockGasOption, onSelect }} />,
    );

    fireEvent.press(getByTestId('gas-option-fast'));

    expect(onSelect).toHaveBeenCalled();
  });

  it('renders the gas option with estimated time', () => {
    const { getByText } = render(
      <GasOption option={{ ...mockGasOption, estimatedTime: '10s' }} />,
    );

    expect(getByText('10s')).toBeOnTheScreen();
  });

  it('renders the gas option with selected option', () => {
    const { getByTestId } = render(
      <GasOption option={{ ...mockGasOption, isSelected: true }} />,
    );

    expect(getByTestId('selection-indicator')).toBeOnTheScreen();
  });
});
