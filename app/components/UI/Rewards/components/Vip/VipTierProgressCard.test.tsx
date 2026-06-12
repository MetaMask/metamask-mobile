import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import LinearGradient from 'react-native-linear-gradient';
import VipTierProgressCard, {
  VIP_TIER_PROGRESS_CARD_TEST_IDS,
} from './VipTierProgressCard';
import {
  VIP_GOLD_BACKGROUND_GRADIENT_COLORS,
  VIP_GOLD_BORDER_DEFAULT,
  VIP_GOLD_PROGRESS_GRADIENT_COLORS,
  VIP_GOLD_TEXT_MUTED,
} from './Vip.constants';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme, ThemeContext } from '../../../../../util/theme';

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

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../../../images/rewards/vip.svg', () => 'VipIcon');

const renderWithTheme = (
  ui: React.ReactElement,
  themeAppearance: AppThemeKey = AppThemeKey.light,
) => {
  const renderWithProvider = (
    element: React.ReactElement,
    appearance: AppThemeKey,
  ) => (
    <ThemeContext.Provider
      value={{ ...mockTheme, themeAppearance: appearance }}
    >
      {element}
    </ThemeContext.Provider>
  );

  const result = render(renderWithProvider(ui, themeAppearance));

  return {
    ...result,
    rerender: (
      nextUi: React.ReactElement,
      nextThemeAppearance: AppThemeKey = themeAppearance,
    ) => result.rerender(renderWithProvider(nextUi, nextThemeAppearance)),
  };
};

describe('VipTierProgressCard', () => {
  const baseProps = {
    currentTier: { id: 't3', name: 'Gold Fox VIP 3', tier: 3 },
    progress: {
      percent: 72,
      remainingPointsToNextTier: 800_000,
      status: 'on_track',
    },
    subline: '$800K Swaps • $3.6M Perps to Gold Fox VIP 4',
    memberIdTitle: 'Member ID',
    memberId: 'VIP-123',
  };

  it('renders the current tier name, member id, and the subline passed in by the parent', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <VipTierProgressCard {...baseProps} />,
    );

    expect(getByText('Gold Fox VIP 3')).toBeOnTheScreen();
    expect(getByText('Member ID')).toBeOnTheScreen();
    expect(getByText('VIP-123')).toBeOnTheScreen();
    expect(
      getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.SUBLINE),
    ).toHaveTextContent('$800K Swaps • $3.6M Perps to Gold Fox VIP 4');
  });

  it('renders a gold gradient and border from bottom left to top right', () => {
    const { UNSAFE_getAllByType, getByTestId } = renderWithTheme(
      <VipTierProgressCard {...baseProps} />,
    );

    const gradient = UNSAFE_getAllByType(LinearGradient).find(
      ({ props }) => props.testID === VIP_TIER_PROGRESS_CARD_TEST_IDS.GRADIENT,
    );
    if (!gradient) {
      throw new Error('Expected VIP tier progress card gradient to render');
    }
    const border = getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.BORDER);
    const progressFill = getByTestId(
      VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_FILL,
    );
    expect(gradient.props.colors).toEqual(VIP_GOLD_BACKGROUND_GRADIENT_COLORS);
    expect(gradient.props.locations).toEqual([0, 0.9]);
    expect(gradient.props.start).toEqual({ x: 0, y: 1 });
    expect(gradient.props.end).toEqual({ x: 1, y: 0 });
    expect(gradient.props.style).toEqual(['bg-section']);
    expect(progressFill.props.colors).toEqual(
      VIP_GOLD_PROGRESS_GRADIENT_COLORS,
    );
    expect(progressFill.props.start).toEqual({ x: 0, y: 0 });
    expect(progressFill.props.end).toEqual({ x: 1, y: 0 });
    expect(
      Array.isArray(border.props.style)
        ? border.props.style
        : [border.props.style],
    ).toContainEqual(
      expect.objectContaining({
        borderWidth: 1,
        borderColor: VIP_GOLD_BORDER_DEFAULT,
      }),
    );
    expect(gradient.props.testID).toBe(
      VIP_TIER_PROGRESS_CARD_TEST_IDS.GRADIENT,
    );
  });

  it('clamps progress fill width to the 0-100 range', () => {
    const flattenWidth = (style: unknown): string | undefined => {
      const styles = Array.isArray(style) ? style : [style];
      for (const entry of styles.reverse()) {
        if (
          entry &&
          typeof entry === 'object' &&
          'width' in (entry as Record<string, unknown>)
        ) {
          return (entry as { width: string }).width;
        }
      }
      return undefined;
    };

    const { getByTestId, rerender } = renderWithTheme(
      <VipTierProgressCard
        {...baseProps}
        progress={{ ...baseProps.progress, percent: 150 }}
      />,
    );
    expect(
      flattenWidth(
        getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_FILL).props.style,
      ),
    ).toBe('100%');

    rerender(
      <VipTierProgressCard
        {...baseProps}
        progress={{ ...baseProps.progress, percent: -10 }}
      />,
    );
    expect(
      flattenWidth(
        getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_FILL).props.style,
      ),
    ).toBe('0%');
  });

  it('invokes onPress when the card is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <VipTierProgressCard {...baseProps} onPress={onPress} />,
    );
    fireEvent.press(getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.CONTAINER));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses standard alternative text color for member id text in light mode', () => {
    const { getByText } = renderWithTheme(
      <VipTierProgressCard {...baseProps} />,
    );

    expect(getByText('Member ID')).toHaveStyle({
      color: TextColor.TextAlternative,
    });
    expect(getByText('VIP-123')).toHaveStyle({
      color: TextColor.TextAlternative,
    });
  });

  it('uses VIP muted gold for member id text in dark mode', () => {
    const { getByText } = renderWithTheme(
      <VipTierProgressCard {...baseProps} />,
      AppThemeKey.dark,
    );

    expect(getByText('Member ID')).toHaveStyle({
      color: VIP_GOLD_TEXT_MUTED,
    });
    expect(getByText('VIP-123')).toHaveStyle({
      color: VIP_GOLD_TEXT_MUTED,
    });
  });
});
