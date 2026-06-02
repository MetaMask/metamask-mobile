import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import VipFeeTile, { VIP_FEE_TILE_TEST_IDS } from './VipFeeTile';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme, ThemeContext } from '../../../../../util/theme';
import { VIP_GOLD_TEXT_MUTED } from './Vip.constants';

interface MockTextProps {
  children?: React.ReactNode;
  color?: TextColor;
  style?: unknown;
}

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');

  return {
    ...actual,
    Text: ({ children, color, style, ...props }: MockTextProps) =>
      ReactActual.createElement(
        RNText,
        { ...props, style: [{ color }, style] },
        children,
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    if (key === 'rewards.vip.bps_unit') {
      return 'bps';
    }
    return key;
  },
}));

const renderWithTheme = (
  ui: React.ReactElement,
  themeAppearance: AppThemeKey = AppThemeKey.light,
) =>
  render(
    <ThemeContext.Provider value={{ ...mockTheme, themeAppearance }}>
      {ui}
    </ThemeContext.Provider>,
  );

describe('VipFeeTile', () => {
  it('renders the label, current bps value, bps unit, and next-tier delta passed in by the parent', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <VipFeeTile
        label="Swaps fee"
        currentBps={15}
        nextTierLabel="↓ 12 bps next tier"
      />,
    );

    expect(getByText('Swaps fee')).toBeOnTheScreen();
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.CURRENT)).toHaveTextContent(/15/);
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.CURRENT)).toHaveTextContent(/bps/);
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveTextContent(
      /↓ 12 bps next tier/,
    );
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId } = renderWithTheme(
      <VipFeeTile
        label="Perps fee"
        currentBps={4}
        nextTierLabel="↓ 3 bps next tier"
        testID="custom-tile"
      />,
    );
    expect(getByTestId('custom-tile')).toBeOnTheScreen();
  });

  it('formats percent values from bps and renders a custom unit', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <VipFeeTile
        label="Revenue share"
        currentBps={150}
        unit="%"
        nextTierLabel="↑ 2% next tier"
      />,
    );

    expect(getByText('Revenue share')).toBeOnTheScreen();
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.CURRENT)).toHaveTextContent(
      /1.5%/,
    );
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveTextContent(
      /↑ 2% next tier/,
    );
  });

  it('omits the next-tier row when no label is provided', () => {
    const { queryByTestId } = renderWithTheme(
      <VipFeeTile label="Revenue share" currentBps={400} unit="%" />,
    );

    expect(queryByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toBeNull();
  });

  it('uses standard alternative text color for next-tier text in light mode', () => {
    const { getByTestId } = renderWithTheme(
      <VipFeeTile
        label="Swaps fee"
        currentBps={15}
        nextTierLabel="↓ 12 bps next tier"
      />,
    );

    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveStyle({
      color: TextColor.TextAlternative,
    });
  });

  it('uses VIP muted gold for next-tier text in dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <VipFeeTile
        label="Swaps fee"
        currentBps={15}
        nextTierLabel="↓ 12 bps next tier"
      />,
      AppThemeKey.dark,
    );

    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveStyle({
      color: VIP_GOLD_TEXT_MUTED,
    });
  });
});
