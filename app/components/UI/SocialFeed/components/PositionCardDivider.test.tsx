import { fireEvent, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import React from 'react';
import { Line } from 'react-native-svg';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PositionCardDivider from './PositionCardDivider';

const TEST_ID = 'position-card-divider';

const layout = (width: number) =>
  fireEvent(screen.getByTestId(TEST_ID), 'layout', {
    nativeEvent: { layout: { width, height: 2 } },
  });

describe('PositionCardDivider', () => {
  // The rule is drawn to a measured width, so there is nothing to draw until the
  // card reports one.
  it('draws nothing before it has been measured', () => {
    const { UNSAFE_queryAllByType } = renderWithProvider(
      <PositionCardDivider testID={TEST_ID} />,
    );

    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(UNSAFE_queryAllByType(Line)).toHaveLength(0);
  });

  it('dashes a muted rule across the measured width', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PositionCardDivider testID={TEST_ID} />,
    );

    layout(320);

    const { props } = UNSAFE_getAllByType(Line)[0];
    expect(props.x2).toBe(320);
    expect(props.strokeDasharray).toBe('2,4');
    expect(props.stroke).toBe(lightTheme.colors.border.muted);
  });
});
