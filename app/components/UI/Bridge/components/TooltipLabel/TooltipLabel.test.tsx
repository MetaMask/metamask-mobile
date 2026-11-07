import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TooltipLabel } from './index';

const mockOpenTooltipModal = jest.fn();

jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: mockOpenTooltipModal }),
}));

const defaultProps = {
  label: 'Slippage',
  tooltipTitle: 'Slippage title',
  tooltipContent: 'Slippage content',
  testID: 'tooltip-label',
};

describe('TooltipLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label text', () => {
    const { getByTestId } = render(<TooltipLabel {...defaultProps} />);

    expect(getByTestId('tooltip-label')).toHaveTextContent('Slippage');
  });

  it('opens the tooltip with its title and content when the label is pressed', () => {
    const { getByTestId } = render(<TooltipLabel {...defaultProps} />);

    fireEvent.press(getByTestId('tooltip-label'));

    expect(mockOpenTooltipModal).toHaveBeenCalledTimes(1);
    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      'Slippage title',
      'Slippage content',
    );
  });

  it('labels the pressable after the tooltip title', () => {
    const { getByLabelText } = render(<TooltipLabel {...defaultProps} />);

    expect(getByLabelText('Slippage title tooltip')).toBeOnTheScreen();
  });
});
