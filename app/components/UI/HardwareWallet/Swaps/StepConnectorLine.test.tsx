import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Line } from 'react-native-svg';
import { lightTheme } from '@metamask/design-tokens';
import { StepConnectorLine } from './StepConnectorLine';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      border: {
        muted: lightTheme.colors.border.muted,
      },
    },
  }),
}));

describe('StepConnectorLine', () => {
  it('renders with the default testID and minimum height', () => {
    const { getByTestId, UNSAFE_getByType } = render(<StepConnectorLine />);

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Line).props.y2).toBe(16);
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(<StepConnectorLine testID="custom-line" />);

    expect(getByTestId('custom-line')).toBeOnTheScreen();
  });

  it('updates the svg height from layout changes', () => {
    const { getByTestId, UNSAFE_getByType } = render(<StepConnectorLine />);

    fireEvent(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR),
      'layout',
      {
        nativeEvent: { layout: { height: 48 } },
      },
    );

    expect(UNSAFE_getByType(Line).props.y2).toBe(48);
  });

  it('keeps the minimum height when layout height is zero', () => {
    const { getByTestId, UNSAFE_getByType } = render(<StepConnectorLine />);

    fireEvent(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR),
      'layout',
      {
        nativeEvent: { layout: { height: 0 } },
      },
    );

    expect(UNSAFE_getByType(Line).props.y2).toBe(16);
  });
});
