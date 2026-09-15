import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FilterRangeSection from './FilterRangeSection';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../RangeSlider/RangeSlider', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');
  return ({
    onValueChange,
    onDragEnd,
    testID,
  }: {
    onValueChange: (value: { min: number; max: number }) => void;
    onDragEnd?: (value: { min: number; max: number }) => void;
    testID: string;
  }) =>
    ReactActual.createElement(
      View,
      { testID },
      ReactActual.createElement(Pressable, {
        testID: `${testID}-emit-change`,
        onPress: () => onValueChange({ min: 10, max: 90 }),
      }),
      ReactActual.createElement(Pressable, {
        testID: `${testID}-emit-drag-end`,
        onPress: () => onDragEnd?.({ min: 10, max: 90 }),
      }),
    );
});

describe('FilterRangeSection', () => {
  const baseProps = {
    titleKey: 'social_leaderboard.shell.filters.section.market_cap',
    minimumValue: 0,
    maximumValue: 1000,
    value: { min: 0, max: 1000 },
    onValueChange: jest.fn(),
    formatLabel: (value: { min: number; max: number }) =>
      `$${value.min}B - $${value.max}B`,
    testID: 'social-filters-market_cap-slider',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section title and formatted range label', () => {
    render(<FilterRangeSection {...baseProps} />);

    expect(
      screen.getByText('social_leaderboard.shell.filters.section.market_cap'),
    ).toBeOnTheScreen();
    expect(screen.getByText('$0B - $1000B')).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-filters-market_cap-slider'),
    ).toBeOnTheScreen();
  });

  it('forwards slider changes to onValueChange', () => {
    const onValueChange = jest.fn();

    render(<FilterRangeSection {...baseProps} onValueChange={onValueChange} />);
    fireEvent.press(
      screen.getByTestId('social-filters-market_cap-slider-emit-change'),
    );

    expect(onValueChange).toHaveBeenCalledWith({ min: 10, max: 90 });
  });

  it('forwards drag end events to onDragEnd when provided', () => {
    const onDragEnd = jest.fn();

    render(<FilterRangeSection {...baseProps} onDragEnd={onDragEnd} />);
    fireEvent.press(
      screen.getByTestId('social-filters-market_cap-slider-emit-drag-end'),
    );

    expect(onDragEnd).toHaveBeenCalledWith({ min: 10, max: 90 });
  });
});
