import { PerpsMode } from '@metamask/perps-controller';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsModeSelectionBottomSheet from './PerpsModeSelectionBottomSheet';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.mode.selection_title': 'Choose how you trade',
      'perps.mode.lite': 'Lite',
      'perps.mode.lite_description':
        'One-tap longs or shorts. Simple by design.',
      'perps.mode.pro': 'Pro',
      'perps.mode.pro_description':
        'Order book, advanced order types, and leverage.',
    };
    return translations[key] ?? key;
  }),
}));

describe('PerpsModeSelectionBottomSheet', () => {
  const defaultProps = {
    selectedMode: PerpsMode.Lite,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the mode options and their visual assets', () => {
    render(<PerpsModeSelectionBottomSheet {...defaultProps} />);

    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('Choose how you trade');
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_ICON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON),
    ).toBeOnTheScreen();
  });

  it('marks only the selected mode', () => {
    render(
      <PerpsModeSelectionBottomSheet
        {...defaultProps}
        selectedMode={PerpsMode.Pro}
      />,
    );

    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION)
        .props.accessibilityState,
    ).toEqual({ selected: false });
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION)
        .props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getAllByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.SELECTED_INDICATOR,
      ),
    ).toHaveLength(1);
  });

  it('defaults to Lite mode when selectedMode is omitted', () => {
    const { selectedMode: _selectedMode, ...propsWithoutSelectedMode } =
      defaultProps;

    render(<PerpsModeSelectionBottomSheet {...propsWithoutSelectedMode} />);

    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION)
        .props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION)
        .props.accessibilityState,
    ).toEqual({ selected: false });
  });

  it.each([
    [PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION, PerpsMode.Lite],
    [PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION, PerpsMode.Pro],
  ])('calls onSelect with the pressed mode for %s', (testID, mode) => {
    const onSelect = jest.fn();
    render(
      <PerpsModeSelectionBottomSheet {...defaultProps} onSelect={onSelect} />,
    );

    fireEvent.press(screen.getByTestId(testID));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mode);
  });

  it('renders nothing when hidden', () => {
    render(
      <PerpsModeSelectionBottomSheet {...defaultProps} isVisible={false} />,
    );

    expect(
      screen.queryByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
