import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_SLIPPAGE_STEP_BPS } from '../../constants/slippageConfig';
import { PerpsCustomSlippageBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsCustomSlippageBottomSheet from './PerpsCustomSlippageBottomSheet';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.slippage.use_custom_title': 'Use custom slippage',
      'perps.slippage.cancel': 'Cancel',
      'perps.slippage.set': 'Set',
    };
    if (key === 'perps.slippage.out_of_range' && params) {
      return `Must be between ${params.min}% and ${params.max}%`;
    }
    return translations[key] || key;
  }),
}));

const defaultProps = {
  isVisible: true,
  currentValueBps: 300, // 3%
  onClose: jest.fn(),
  onSave: jest.fn(),
};

describe('PerpsCustomSlippageBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsCustomSlippageBottomSheet {...defaultProps} isVisible={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders the title through the design system bottom sheet header', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    // The DS header owns the title typography, so the string is passed as a
    // child rather than wrapped in a locally styled Text.
    expect(
      screen.getByText(strings('perps.slippage.use_custom_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.CLOSE),
    ).toBeOnTheScreen();
  });

  it('renders the close button at the design system header size', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    // The DS header sizes its own close button (ButtonIconSize.Md), so this
    // guards against a local `size` override creeping back in.
    expect(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.CLOSE),
    ).toHaveStyle({ height: 32, width: 32 });
  });

  it('closes when the header close button is pressed', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.CLOSE),
    );

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes when the footer cancel button is pressed', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.CANCEL),
    );

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('saves the current value in bps when set is pressed', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.SET),
    );

    expect(defaultProps.onSave).toHaveBeenCalledWith(300);
  });

  it('steps the value up and down by the configured increment', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.INCREMENT),
    );
    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.SET),
    );

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      defaultProps.currentValueBps + PERPS_SLIPPAGE_STEP_BPS,
    );

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.DECREMENT),
    );
    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.SET),
    );

    expect(defaultProps.onSave).toHaveBeenLastCalledWith(
      defaultProps.currentValueBps,
    );
  });
});
