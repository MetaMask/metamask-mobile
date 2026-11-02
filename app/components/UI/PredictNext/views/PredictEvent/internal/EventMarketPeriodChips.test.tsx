import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EventMarketPeriodChips } from './EventMarketPeriodChips';
import { EventMarketPeriodChipsTestIds as TestIds } from './EventMarketPeriodChips.testIds';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

const PERIODS = [
  { key: 'full_game', label: 'Full game' },
  { key: 'first_half', label: '1st half' },
  { key: 'second_half', label: '2nd half' },
  { key: 'q1', label: '1st quarter' },
  { key: 'q2', label: '2nd quarter' },
  { key: 'q3', label: '3rd quarter' },
  { key: 'q4', label: '4th quarter' },
];

const renderChips = (
  props: Partial<React.ComponentProps<typeof EventMarketPeriodChips>> = {},
) =>
  render(
    <EventMarketPeriodChips
      items={PERIODS}
      selectedKey="full_game"
      onSelect={jest.fn()}
      {...props}
    />,
  );

const list = () => screen.getByTestId(TestIds.LIST);
const layOut = (containerWidth: number, contentWidth: number) => {
  fireEvent(list(), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: containerWidth, height: 40 } },
  });
  fireEvent(list(), 'contentSizeChange', contentWidth, 40);
};
const scrollTo = (x: number, containerWidth: number, contentWidth: number) =>
  fireEvent.scroll(list(), {
    nativeEvent: {
      contentOffset: { x, y: 0 },
      layoutMeasurement: { width: containerWidth, height: 40 },
      contentSize: { width: contentWidth, height: 40 },
    },
  });

describe('EventMarketPeriodChips', () => {
  it('renders a chip per period and marks the selected one', () => {
    renderChips({ selectedKey: 'first_half' });

    for (const { key, label } of PERIODS) {
      expect(screen.getByTestId(TestIds.CHIP(key))).toHaveTextContent(label);
    }
    const isSelected = (key: string) =>
      screen.getByTestId(TestIds.CHIP(key)).props.accessibilityState.selected;
    expect(isSelected('first_half')).toBe(true);
    expect(isSelected('full_game')).toBe(false);
  });

  it('calls onSelect with the pressed period key', () => {
    const onSelect = jest.fn();
    renderChips({ onSelect });

    fireEvent.press(screen.getByTestId(TestIds.CHIP('q3')));

    expect(onSelect).toHaveBeenCalledWith('q3');
  });

  it('renders a single period', () => {
    renderChips({ items: PERIODS.slice(0, 1) });

    expect(screen.getByTestId(TestIds.CHIP('full_game'))).toBeOnTheScreen();
  });

  it('fades the trailing edge only while more chips are off-screen', () => {
    renderChips();

    expect(screen.queryByTestId(TestIds.FADE)).not.toBeOnTheScreen();

    layOut(361, 760);
    expect(screen.getByTestId(TestIds.FADE)).toBeOnTheScreen();

    scrollTo(399, 361, 760);
    expect(screen.queryByTestId(TestIds.FADE)).not.toBeOnTheScreen();

    scrollTo(100, 361, 760);
    expect(screen.getByTestId(TestIds.FADE)).toBeOnTheScreen();
  });

  it('does not fade when every chip fits', () => {
    renderChips({ items: PERIODS.slice(0, 2) });

    layOut(361, 190);

    expect(screen.queryByTestId(TestIds.FADE)).not.toBeOnTheScreen();
  });
});
