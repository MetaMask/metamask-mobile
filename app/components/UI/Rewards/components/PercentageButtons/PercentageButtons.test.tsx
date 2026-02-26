import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PercentageButtons, { PercentageButtonOption } from './PercentageButtons';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((className) => ({ className })),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  BoxFlexDirection: { Row: 'Row' },
}));

jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  __esModule: true,
  default: 'Button',
  ButtonSize: { Md: 'Md' },
  ButtonVariants: { Secondary: 'Secondary' },
}));

describe('PercentageButtons', () => {
  const mockOptions: PercentageButtonOption[] = [
    { value: 25, label: '25%' },
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 100, label: '100%' },
  ];

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all percentage buttons', () => {
    const { getByTestId } = render(
      <PercentageButtons options={mockOptions} onPress={mockOnPress} />,
    );

    expect(getByTestId('percentage-buttons')).toBeOnTheScreen();
    expect(getByTestId('percentage-buttons-25')).toBeOnTheScreen();
    expect(getByTestId('percentage-buttons-50')).toBeOnTheScreen();
    expect(getByTestId('percentage-buttons-75')).toBeOnTheScreen();
    expect(getByTestId('percentage-buttons-100')).toBeOnTheScreen();
  });

  it('calls onPress with correct value when a button is pressed', () => {
    const { getByTestId } = render(
      <PercentageButtons options={mockOptions} onPress={mockOnPress} />,
    );

    fireEvent.press(getByTestId('percentage-buttons-50'));

    expect(mockOnPress).toHaveBeenCalledWith(50);
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <PercentageButtons
        options={mockOptions}
        onPress={mockOnPress}
        testID="custom-buttons"
      />,
    );

    expect(getByTestId('custom-buttons')).toBeOnTheScreen();
    expect(getByTestId('custom-buttons-25')).toBeOnTheScreen();
  });
});
