import { screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PositionCardDivider from './PositionCardDivider';

const TEST_ID = 'position-card-divider';

describe('PositionCardDivider', () => {
  it('dashes a muted rule across the full width on first render', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <PositionCardDivider testID={TEST_ID} />,
    );

    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(UNSAFE_getByType(Svg).props.width).toBe('100%');
    const { props } = UNSAFE_getByType(Line);
    expect(props.x2).toBe('100%');
    expect(props.strokeDasharray).toBe('2,4');
    expect(props.stroke).toBe(lightTheme.colors.border.muted);
  });

  it('draws the rule at 1px, as the Figma divider does', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <PositionCardDivider testID={TEST_ID} />,
    );

    const { props } = UNSAFE_getByType(Line);
    expect(UNSAFE_getByType(Svg).props.height).toBe(1);
    expect(props.strokeWidth).toBe(1);
    expect(props.y1).toBe(0.5);
    expect(props.y2).toBe(0.5);
  });

  it('takes no layout height and hangs its line one stroke above the box', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <PositionCardDivider testID={TEST_ID} />,
    );

    const boxStyle = StyleSheet.flatten(
      screen.getByTestId(TEST_ID).props.style,
    );
    const svgStyle = StyleSheet.flatten(UNSAFE_getByType(Svg).props.style);
    expect(boxStyle?.height).toBe(0);
    expect(svgStyle?.marginTop).toBe(-1);
  });
});
