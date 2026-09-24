import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Icon } from '@metamask/design-system-react-native';
import PerpsMarginModeBottomSheet from './PerpsMarginModeBottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { PerpsMarginModeBottomSheetSelectorsIDs } from '../../Perps.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const resolveStyle = (...args: unknown[]) => {
    const classNames = JSON.stringify(args);
    const style: Record<string, string> = {};
    if (classNames.includes('bg-background-muted')) {
      style.backgroundColor = 'muted';
    }
    return style;
  };
  const tw = (...args: unknown[]) => resolveStyle(...args);
  tw.style = jest.fn(resolveStyle);
  return { useTailwind: () => tw };
});

// Use a plain function (not jest.fn()) so jest.clearAllMocks() cannot wipe its implementation
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.margin_mode.title': 'Choose margin mode',
      'perps.margin_mode.isolated_title': 'Isolated',
      'perps.margin_mode.isolated_description':
        'Each position uses only its allocated margin.',
      'perps.margin_mode.cross_title': 'Cross',
      'perps.margin_mode.cross_description':
        'Your full account balance is shared across all positions. Coming soon.',
      'perps.margin_mode.cross_description_available':
        'Your full account balance is shared across all positions.',
    };
    return translations[key] || key;
  },
}));

describe('PerpsMarginModeBottomSheet', () => {
  // Declare inside beforeEach so each test gets a fresh jest.fn() instance
  let defaultProps: { isVisible: boolean; onClose: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps = {
      isVisible: true,
      onClose: jest.fn(),
    };
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

  it('highlights Isolated without a selected checkmark', () => {
    render(<PerpsMarginModeBottomSheet {...defaultProps} />);

    const selectedOption = screen.getByTestId(
      PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
    );

    expect(selectedOption).toHaveStyle({ backgroundColor: 'muted' });
    expect(within(selectedOption).UNSAFE_queryByType(Icon)).toBeNull();
  });

  it('calls onClose when the header close button is pressed', () => {
    const onClose = jest.fn();
    render(<PerpsMarginModeBottomSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(
      screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('cross margin availability', () => {
    it('keeps Cross disabled with coming soon copy when unavailable', () => {
      const onMarginModeSelect = jest.fn();
      render(
        <PerpsMarginModeBottomSheet
          {...defaultProps}
          onMarginModeSelect={onMarginModeSelect}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION),
      );

      expect(onMarginModeSelect).not.toHaveBeenCalled();
      expect(
        screen.getByText(strings('perps.margin_mode.cross_description')),
      ).toBeOnTheScreen();
    });

    it('selects Cross and closes when available', () => {
      const onClose = jest.fn();
      const onMarginModeSelect = jest.fn();
      render(
        <PerpsMarginModeBottomSheet
          {...defaultProps}
          onClose={onClose}
          isCrossMarginAvailable
          onMarginModeSelect={onMarginModeSelect}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION),
      );

      expect(onMarginModeSelect).toHaveBeenCalledWith('cross');
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(
          strings('perps.margin_mode.cross_description_available'),
        ),
      ).toBeOnTheScreen();
    });

    it('selects Isolated when pressed while Cross is active', () => {
      const onMarginModeSelect = jest.fn();
      render(
        <PerpsMarginModeBottomSheet
          {...defaultProps}
          isCrossMarginAvailable
          selectedMarginMode="cross"
          onMarginModeSelect={onMarginModeSelect}
        />,
      );

      fireEvent.press(
        screen.getByTestId(
          PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
        ),
      );

      expect(onMarginModeSelect).toHaveBeenCalledWith('isolated');
    });

    it('highlights Cross when it is the selected mode', () => {
      render(
        <PerpsMarginModeBottomSheet
          {...defaultProps}
          isCrossMarginAvailable
          selectedMarginMode="cross"
        />,
      );

      expect(
        screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION),
      ).toHaveStyle({ backgroundColor: 'muted' });
    });

    it('blocks switching away from an open position margin mode', () => {
      const onMarginModeSelect = jest.fn();
      render(
        <PerpsMarginModeBottomSheet
          {...defaultProps}
          isCrossMarginAvailable
          isMarginModeLocked
          selectedMarginMode="cross"
          onMarginModeSelect={onMarginModeSelect}
        />,
      );

      fireEvent.press(
        screen.getByTestId(
          PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
        ),
      );

      expect(onMarginModeSelect).not.toHaveBeenCalled();
    });

    it('blocks Cross while an isolated position locks the margin mode', () => {
      const onMarginModeSelect = jest.fn();
      render(
        <PerpsMarginModeBottomSheet
          {...defaultProps}
          isCrossMarginAvailable
          isMarginModeLocked
          onMarginModeSelect={onMarginModeSelect}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION),
      );

      expect(onMarginModeSelect).not.toHaveBeenCalled();
    });
  });
});
