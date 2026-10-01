import { Text } from '@metamask/design-system-react-native';
import { lightTheme } from '@metamask/design-tokens';
import { screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PositionCardShell, { type PositionCardTone } from './PositionCardShell';

const CARD_TEST_ID = 'position-card-shell-body';

const renderShell = (tone?: PositionCardTone) =>
  renderWithProvider(
    <PositionCardShell tone={tone}>
      <Text testID={CARD_TEST_ID}>Body</Text>
    </PositionCardShell>,
  );

const gradientColorsOf = (
  utils: ReturnType<typeof renderWithProvider>,
): string[] => utils.UNSAFE_getAllByType(LinearGradient)[0].props.colors;

const cardStyleOf = (utils: ReturnType<typeof renderWithProvider>) =>
  StyleSheet.flatten(
    utils.UNSAFE_getAllByType(LinearGradient)[0].parent?.props.style,
  );

describe('PositionCardShell', () => {
  it('renders its children above the gradient', () => {
    const utils = renderShell();

    expect(screen.getByTestId(CARD_TEST_ID)).toBeOnTheScreen();
    expect(utils.UNSAFE_getAllByType(LinearGradient)).toHaveLength(1);
  });

  // Every stop shares one hue so the wash fades out through itself: fading to
  // `transparent` fades towards black, which dirties the card on a light theme.
  it('fades one hue from 9% to nothing, and is already fading a third of the way across', () => {
    const utils = renderShell('positive');
    const base = lightTheme.colors.success.default;

    expect(gradientColorsOf(utils)).toEqual([
      `${base}17`,
      `${base}0d`,
      `${base}00`,
    ]);
    expect(
      utils.UNSAFE_getAllByType(LinearGradient)[0].props.locations,
    ).toEqual([0, 0.32, 1]);
  });

  it('washes a neutral card with the foreground tint behind a hairline border', () => {
    const utils = renderShell('neutral');

    expect(gradientColorsOf(utils)[0]).toBe(
      `${lightTheme.colors.icon.default}17`,
    );
    expect(cardStyleOf(utils)?.borderColor).toBe(
      lightTheme.colors.border.muted,
    );
    expect(cardStyleOf(utils)?.borderWidth).toBe(1);
  });

  // A heavier border is what separates a win from a loss at a glance.
  it('washes a winning card green and outlines it in green, twice as thick', () => {
    const utils = renderShell('positive');

    expect(gradientColorsOf(utils)[0]).toBe(
      `${lightTheme.colors.success.default}17`,
    );
    expect(cardStyleOf(utils)?.borderColor).toBe(
      lightTheme.colors.success.default,
    );
    expect(cardStyleOf(utils)?.borderWidth).toBe(2);
  });

  it('washes a losing card red and outlines it in red', () => {
    const utils = renderShell('negative');

    expect(gradientColorsOf(utils)[0]).toBe(
      `${lightTheme.colors.error.default}17`,
    );
    expect(cardStyleOf(utils)?.borderColor).toBe(
      lightTheme.colors.error.default,
    );
    expect(cardStyleOf(utils)?.borderWidth).toBe(2);
  });

  it('defaults to the neutral tone', () => {
    expect(gradientColorsOf(renderShell())).toEqual(
      gradientColorsOf(renderShell('neutral')),
    );
  });
});
