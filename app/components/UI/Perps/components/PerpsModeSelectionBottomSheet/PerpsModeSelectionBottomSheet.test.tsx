import { IconName } from '@metamask/design-system-react-native';
import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { PerpsMode } from '@metamask/perps-controller';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import {
  PERPS_PRO_CANDLESTICK_DARK,
  PERPS_PRO_CANDLESTICK_LIGHT,
  PERPS_PRO_ICON_TILE_DARK,
  PERPS_PRO_ICON_TILE_LIGHT,
} from '../../constants/perpsModeColors';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsModeSelectionBottomSheet from './PerpsModeSelectionBottomSheet';

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

const darkThemeContext = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

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

  it('renders the Pro icon as the filled candlestick in light-theme gold', () => {
    render(<PerpsModeSelectionBottomSheet {...defaultProps} />);

    const proIcon = screen.getByTestId(
      PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON,
    );

    expect(proIcon.props.name).toBe(IconName.CandlestickFilled);
    expect(proIcon.props.fill).toBe(PERPS_PRO_CANDLESTICK_LIGHT);
    expect(proIcon).toHaveStyle({ color: PERPS_PRO_CANDLESTICK_LIGHT });
    expect(
      screen.getByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON_TILE,
      ),
    ).toHaveStyle({ backgroundColor: PERPS_PRO_ICON_TILE_LIGHT });
  });

  it('renders the Pro icon in dark-theme gold', () => {
    render(
      <ThemeContext.Provider value={darkThemeContext}>
        <PerpsModeSelectionBottomSheet {...defaultProps} />
      </ThemeContext.Provider>,
    );

    const proIcon = screen.getByTestId(
      PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON,
    );

    expect(proIcon.props.fill).toBe(PERPS_PRO_CANDLESTICK_DARK);
    expect(proIcon).toHaveStyle({ color: PERPS_PRO_CANDLESTICK_DARK });
    expect(
      screen.getByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.PRO_ICON_TILE,
      ),
    ).toHaveStyle({ backgroundColor: PERPS_PRO_ICON_TILE_DARK });
  });

  it('lets both cards grow with their text instead of pinning a card height', () => {
    render(<PerpsModeSelectionBottomSheet {...defaultProps} />);

    [
      PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION,
      PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
    ].forEach((testID) => {
      // `height: auto` keeps the longest description from being clipped,
      // `alignSelf: stretch` makes the shorter card match the taller one, and
      // `minWidth: 0` lets the 2-column flex row wrap instead of overflow.
      expect(screen.getByTestId(testID)).toHaveStyle({
        height: 'auto',
        alignSelf: 'stretch',
        minWidth: 0,
        justifyContent: 'flex-start',
      });
    });
  });

  it('paints both mode cards with the section background', () => {
    render(
      <PerpsModeSelectionBottomSheet
        {...defaultProps}
        selectedMode={PerpsMode.Pro}
      />,
    );

    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION),
    ).toHaveStyle({
      backgroundColor: lightTheme.colors.background.section,
    });
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION),
    ).toHaveStyle({
      backgroundColor: lightTheme.colors.background.section,
    });
  });

  it('sizes card titles and descriptions to the spec typography', () => {
    render(<PerpsModeSelectionBottomSheet {...defaultProps} />);

    // Title = Body/Md/Medium, description = Body/Sm/Regular.
    expect(screen.getByText('Pro')).toHaveStyle({
      fontSize: 16,
      lineHeight: 24,
    });
    expect(
      screen.getByText('Order book, advanced order types, and leverage.'),
    ).toHaveStyle({ fontSize: 14, lineHeight: 22 });
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
