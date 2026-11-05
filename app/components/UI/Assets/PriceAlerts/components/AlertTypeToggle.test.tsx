import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { CreatePriceAlertTestIds } from '../constants';
import AlertTypeToggle from './AlertTypeToggle';

jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn().mockResolvedValue(undefined),
}));

const mockPlaySelection = playSelection as jest.MockedFunction<
  typeof playSelection
>;
const mockOnChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AlertTypeToggle', () => {
  it.each([
    ['absolute_price', 'price_alerts.price_target'],
    ['percent_change', 'price_alerts.price_change'],
  ] as const)('renders the %s label', (value, labelKey) => {
    const { getByTestId } = render(
      <AlertTypeToggle value={value} onChange={mockOnChange} />,
    );

    expect(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT)).toHaveTextContent(
      strings(labelKey),
    );
    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_ICON),
    ).toBeOnTheScreen();
  });

  it('swaps from target to percent change', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('percent_change');
  });

  it('swaps from percent change to target', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="percent_change" onChange={mockOnChange} />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT));

    expect(mockOnChange).toHaveBeenCalledWith('absolute_price');
  });

  it('plays haptic feedback when swapping', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT));

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('reports disabled while editing', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value="absolute_price"
        onChange={mockOnChange}
        isDisabled
      />,
    );

    expect(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT)).toBeDisabled();
  });

  it('ignores presses while disabled', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value="absolute_price"
        onChange={mockOnChange}
        isDisabled
      />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT));

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
