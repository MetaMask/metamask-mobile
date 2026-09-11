import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SortFilterSelector, SortFilterSheet } from './SortFilter';
import {
  SortFilterSelectorsIDs,
  getSortFilterOptionTestId,
} from './Filters.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SortFilterSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the active metric label', () => {
    renderWithProvider(<SortFilterSelector value="pnl" onPress={jest.fn()} />);

    expect(
      screen.getByText('social_leaderboard.sort_filter.pnl'),
    ).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(<SortFilterSelector value="pnl" onPress={onPress} />);

    fireEvent.press(screen.getByTestId(SortFilterSelectorsIDs.SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('SortFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers the shipped ranking metrics only', () => {
    renderWithProvider(
      <SortFilterSheet
        isOpen
        value="pnl"
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(getSortFilterOptionTestId('pnl')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSortFilterOptionTestId('roi')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSortFilterOptionTestId('winRate')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getSortFilterOptionTestId('tradeCount')),
    ).not.toBeOnTheScreen();
  });

  it('selects a new metric and closes', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProvider(
      <SortFilterSheet
        isOpen
        value="pnl"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getSortFilterOptionTestId('winRate')));

    expect(onChange).toHaveBeenCalledWith('winRate');
    expect(onClose).toHaveBeenCalled();
  });
});
