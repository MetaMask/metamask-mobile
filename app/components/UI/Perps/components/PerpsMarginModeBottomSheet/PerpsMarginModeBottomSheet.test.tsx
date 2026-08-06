import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsMarginModeBottomSheet from './PerpsMarginModeBottomSheet';
import { PerpsMarginModeBottomSheetSelectorsIDs } from '../../Perps.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.margin_mode.title': 'Choose margin mode',
      'perps.margin_mode.isolated_title': 'Isolated',
      'perps.margin_mode.isolated_description':
        'Each position uses only its allocated margin.',
      'perps.margin_mode.cross_title': 'Cross',
      'perps.margin_mode.cross_description':
        'Your full account balance is shared across all positions.',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarginModeBottomSheet', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Isolated and Cross rows when visible', () => {
    render(<PerpsMarginModeBottomSheet {...defaultProps} />);
    expect(
      screen.getByTestId(
        PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION),
    ).toBeOnTheScreen();
  });

  it('returns null when not visible', () => {
    render(<PerpsMarginModeBottomSheet {...defaultProps} isVisible={false} />);
    expect(
      screen.queryByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('calls onClose when the Isolated row is pressed', () => {
    const onClose = jest.fn();
    render(<PerpsMarginModeBottomSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(
      screen.getByTestId(
        PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
      ),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the margin mode title', () => {
    render(<PerpsMarginModeBottomSheet {...defaultProps} />);
    expect(
      screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the bottom sheet container', () => {
    render(<PerpsMarginModeBottomSheet {...defaultProps} />);
    expect(
      screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('does not call onClose when the disabled Cross row is pressed', () => {
    const onClose = jest.fn();
    render(<PerpsMarginModeBottomSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(
      screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the header close button is pressed', () => {
    const onClose = jest.fn();
    render(<PerpsMarginModeBottomSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(
      screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
