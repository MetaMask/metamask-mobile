import { Text } from '@metamask/design-system-react-native';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import { screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { AppThemeKey, type Theme } from '../../../../util/theme/models';
import PositionCardShell, { type PositionCardTone } from './PositionCardShell';

const CARD_TEST_ID = 'position-card-shell-body';

const darkMockTheme: Theme = {
  ...mockTheme,
  colors: darkTheme.colors,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  themeAppearance: AppThemeKey.dark,
};

const renderShell = (tone?: PositionCardTone) =>
  renderWithProvider(
    <PositionCardShell tone={tone}>
      <Text testID={CARD_TEST_ID}>Body</Text>
    </PositionCardShell>,
    { theme: darkMockTheme },
  );

const renderLightShell = (tone?: PositionCardTone) =>
  renderWithProvider(
    <PositionCardShell tone={tone}>
      <Text testID={CARD_TEST_ID}>Body</Text>
    </PositionCardShell>,
  );

const gradientOf = (utils: ReturnType<typeof renderWithProvider>) =>
  utils.UNSAFE_getAllByType(LinearGradient)[0];

const cardStyleOf = () =>
  StyleSheet.flatten(screen.getByTestId('position-card-shell').props.style);

describe('PositionCardShell', () => {
  it('renders its children', () => {
    renderLightShell();

    expect(screen.getByTestId(CARD_TEST_ID)).toBeOnTheScreen();
  });

  it('draws no wash in light mode', () => {
    const utils = renderLightShell('positive');

    expect(utils.UNSAFE_queryAllByType(LinearGradient)).toHaveLength(0);
  });

  it('rounds open and closed cards with the 16px radius token', () => {
    renderShell('positive');
    expect(cardStyleOf()?.borderRadius).toBe(16);

    renderShell('negative');
    expect(cardStyleOf()?.borderRadius).toBe(16);
  });

  it('clips the wash to the card edge, outside the content padding', () => {
    const gradient = gradientOf(renderShell('positive'));
    const clipStyle = StyleSheet.flatten(gradient.parent?.props.style);
    const contentStyle = StyleSheet.flatten(
      screen.getByTestId('position-card-shell-content').props.style,
    );

    expect(clipStyle?.position).toBe('absolute');
    expect(clipStyle?.top).toBe(0);
    expect(clipStyle?.overflow).toBe('hidden');
    expect(clipStyle?.borderRadius).toBe(cardStyleOf()?.borderRadius);
    expect(cardStyleOf()?.paddingTop).toBeUndefined();
    expect(cardStyleOf()?.gap).toBeUndefined();
    expect(contentStyle?.paddingTop).toBe(12);
    expect(contentStyle?.paddingBottom).toBe(12);
    expect(contentStyle?.gap).toBe(8);
  });

  it('uses one wash that starts on the top edge, right of center', () => {
    const gradient = gradientOf(renderShell('positive'));
    const losing = gradientOf(renderShell('negative'));

    expect(gradient.props.colors[0]).toBe(darkTheme.colors.success.muted);
    expect(gradient.props.colors[2]).toBe('#b9f30213');
    expect(gradient.props.colors.at(-1)).toBe(
      `${darkTheme.colors.success.default}00`,
    );
    expect(gradient.props.locations).toEqual([0, 0.175, 0.35, 0.525, 0.7]);
    expect(gradient.props.start.y).toBeCloseTo(0, 4);
    expect(gradient.props.start.x).toBeCloseTo(0.8398, 3);
    expect(gradient.props.end.y).toBeCloseTo(1, 4);
    expect(gradient.props.end.x).toBeCloseTo(0.1602, 3);
    expect(losing.props.start).toEqual(gradient.props.start);
    expect(losing.props.end).toEqual(gradient.props.end);
    expect(losing.props.locations).toEqual(gradient.props.locations);
  });

  it('keeps a hairline border when the wash is tinted', () => {
    renderShell('positive');

    expect(cardStyleOf()?.borderColor).toBe(lightTheme.colors.border.muted);
    expect(cardStyleOf()?.borderWidth).toBe(1);
  });

  it('washes a losing card red and keeps the muted hairline', () => {
    const utils = renderShell('negative');

    expect(gradientOf(utils).props.colors[0]).toBe(
      darkTheme.colors.error.muted,
    );
    expect(cardStyleOf()?.borderColor).toBe(lightTheme.colors.border.muted);
    expect(cardStyleOf()?.borderWidth).toBe(1);
  });

  it('leaves a neutral card without a wash', () => {
    const utils = renderShell('neutral');

    expect(utils.UNSAFE_queryAllByType(LinearGradient)).toHaveLength(0);
    expect(cardStyleOf()?.borderColor).toBe(lightTheme.colors.border.muted);
    expect(cardStyleOf()?.borderWidth).toBe(1);
  });

  it('uses the light hairline when no tone is passed', () => {
    renderLightShell();

    expect(cardStyleOf()?.borderColor).toBe(lightTheme.colors.border.muted);
    expect(cardStyleOf()?.borderWidth).toBe(1);
  });
});
