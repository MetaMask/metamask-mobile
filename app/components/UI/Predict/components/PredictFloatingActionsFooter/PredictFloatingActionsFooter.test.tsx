import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import PredictFloatingActionsFooter from './PredictFloatingActionsFooter';

const TEST_ID = 'floating-footer';

const createScrollY = () => ({ value: 0 }) as unknown as SharedValue<number>;

describe('PredictFloatingActionsFooter', () => {
  it('floats its children above the given bottom offset', () => {
    render(
      <PredictFloatingActionsFooter
        testID={TEST_ID}
        scrollY={createScrollY()}
        bottom={34}
      >
        <Text>Up</Text>
      </PredictFloatingActionsFooter>,
    );

    expect(screen.getByText('Up')).toBeOnTheScreen();
    expect(screen.getByTestId(TEST_ID)).toHaveStyle({
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 34,
    });
  });

  it('accepts touches while shown', () => {
    render(
      <PredictFloatingActionsFooter
        testID={TEST_ID}
        scrollY={createScrollY()}
        bottom={0}
      >
        <Text>Up</Text>
      </PredictFloatingActionsFooter>,
    );

    expect(screen.getByTestId(TEST_ID).props.pointerEvents).toBe('box-none');
  });

  it('reports its measured height', () => {
    const onHeightChange = jest.fn();
    render(
      <PredictFloatingActionsFooter
        testID={TEST_ID}
        scrollY={createScrollY()}
        bottom={0}
        onHeightChange={onHeightChange}
      >
        <Text>Up</Text>
      </PredictFloatingActionsFooter>,
    );

    fireEvent(screen.getByTestId(TEST_ID), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 48 } },
    });

    expect(onHeightChange).toHaveBeenCalledWith(48);
  });
});
