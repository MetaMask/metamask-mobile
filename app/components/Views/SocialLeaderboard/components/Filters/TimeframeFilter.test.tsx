import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  TimeframeFilterSelector,
  TimeframeFilterSheet,
} from './TimeframeFilter';
import {
  TimeframeFilterSelectorsIDs,
  getTimeframeFilterOptionTestId,
} from './Filters.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TimeframeFilterSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the active window label', () => {
    renderWithProvider(
      <TimeframeFilterSelector value="30d" onPress={jest.fn()} />,
    );

    expect(
      screen.getByText('social_leaderboard.timeframe_filter.30d'),
    ).toBeOnTheScreen();
  });

  it('calls onPress when the pill is pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <TimeframeFilterSelector value="7d" onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId(TimeframeFilterSelectorsIDs.SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('TimeframeFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithProvider(
      <TimeframeFilterSheet
        isOpen={false}
        value="7d"
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(TimeframeFilterSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('selects a new window with a haptic and closes', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProvider(
      <TimeframeFilterSheet
        isOpen
        value="7d"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getTimeframeFilterOptionTestId('30d')));

    expect(onChange).toHaveBeenCalledWith('30d');
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });
});
