import { Text } from '@metamask/design-system-react-native';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import { act, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { AppThemeKey, type Theme } from '../../../../util/theme/models';
import PositionCardShell, {
  type PositionCardTone,
  washAngleFor,
} from './PositionCardShell';

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

  it('fades the success tint to clear at 70% of the wash', () => {
    const gradient = gradientOf(renderShell('positive'));

    expect(gradient.props.colors[0]).toBe(darkTheme.colors.success.muted);
    expect(gradient.props.colors[2]).toBe('#b9f30213');
    expect(gradient.props.colors.at(-1)).toBe(
      `${darkTheme.colors.success.default}00`,
    );
    expect(gradient.props.locations).toEqual([0, 0.175, 0.35, 0.525, 0.7]);
  });

  it('uses the expanded card angle before the card is measured', () => {
    const gradient = gradientOf(renderShell('positive'));

    expect(gradient.props.useAngle).toBe(true);
    expect(gradient.props.angle).toBeCloseTo(214.2, 1);
  });

  it.each([
    ['compact', 309, 68, 192.41],
    ['closed', 309, 130, 202.82],
    ['expanded', 309, 210, 214.2],
  ])(
    'runs the wash corner to corner on a %s card',
    (_label, width, height, expectedAngle) => {
      const utils = renderShell('negative');
      const clip = gradientOf(utils).parent;

      act(() => {
        clip?.props.onLayout({ nativeEvent: { layout: { width, height } } });
      });

      expect(gradientOf(utils).props.angle).toBeCloseTo(expectedAngle, 1);
    },
  );

  it('ignores a zero-size layout', () => {
    const utils = renderShell('positive');
    const clip = gradientOf(utils).parent;

    act(() => {
      clip?.props.onLayout({
        nativeEvent: { layout: { width: 0, height: 0 } },
      });
    });

    expect(gradientOf(utils).props.angle).toBeCloseTo(214.2, 1);
  });

  it('computes CSS `to bottom left` angles from the box size', () => {
    expect(washAngleFor(100, 100)).toBeCloseTo(225, 5);
    expect(washAngleFor(309, 68)).toBeCloseTo(192.41, 2);
  });

  it('washes a losing card red', () => {
    const utils = renderShell('negative');

    expect(gradientOf(utils).props.colors[0]).toBe(
      darkTheme.colors.error.muted,
    );
  });

  it('draws the hairline above the wash so the tint shows through it', () => {
    const utils = renderShell('positive');
    const card = screen.getByTestId('position-card-shell');
    const border = screen.getByTestId('position-card-shell-border');
    const borderStyle = StyleSheet.flatten(border.props.style);
    const clip = gradientOf(utils).parent;
    const layers = card.findAll((node) => typeof node.type === 'string');

    expect(cardStyleOf()?.borderWidth).toBeUndefined();
    expect(borderStyle?.position).toBe('absolute');
    expect(borderStyle?.borderWidth).toBe(1);
    expect(borderStyle?.borderColor).toBe(lightTheme.colors.border.muted);
    expect(borderStyle?.borderRadius).toBe(cardStyleOf()?.borderRadius);
    expect(border.props.pointerEvents).toBe('none');
    expect(layers.findIndex((node) => node === border)).toBeGreaterThan(
      layers.findIndex((node) => node === clip),
    );
  });

  it('leaves a neutral card without a wash but keeps the hairline', () => {
    const utils = renderShell('neutral');

    expect(utils.UNSAFE_queryAllByType(LinearGradient)).toHaveLength(0);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('position-card-shell-border').props.style,
      )?.borderWidth,
    ).toBe(1);
  });

  it('keeps the hairline in light mode', () => {
    renderLightShell();

    expect(
      StyleSheet.flatten(
        screen.getByTestId('position-card-shell-border').props.style,
      )?.borderColor,
    ).toBe(lightTheme.colors.border.muted);
  });
});
