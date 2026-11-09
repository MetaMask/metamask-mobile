import { screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import React from 'react';
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
});
