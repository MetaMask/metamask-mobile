import { IconName } from '@metamask/design-system-react-native';
import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { FeedSortFilterSelector, FeedSortFilterSheet } from './FeedSortFilter';
import {
  FeedSortFilterSelectorsIDs,
  getFeedSortFilterOptionTestId,
} from './Filters.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('FeedSortFilterSelector', () => {
  it('calls onPress from the sort chip', () => {
    const onPress = jest.fn();

    renderWithProvider(
      <FeedSortFilterSelector value="popular" onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId(FeedSortFilterSelectorsIDs.SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('FeedSortFilterSheet', () => {
  it('marks the selected sort with a check and leaves the other row unmarked', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();

    renderWithProvider(
      <FeedSortFilterSheet
        isOpen
        value="most_recent"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    const selected = screen.getByTestId(
      getFeedSortFilterOptionTestId('most_recent'),
    );
    const unselected = screen.getByTestId(
      getFeedSortFilterOptionTestId('popular'),
    );

    expect(selected).toHaveProp('accessibilityState', { selected: true });
    expect(unselected).toHaveProp('accessibilityState', { selected: false });
    expect(
      within(selected).UNSAFE_getAllByProps({ name: IconName.Check }).length,
    ).toBeGreaterThan(0);
    expect(
      within(unselected).UNSAFE_queryAllByProps({ name: IconName.Check }),
    ).toHaveLength(0);

    fireEvent.press(
      screen.getByTestId(getFeedSortFilterOptionTestId('popular')),
    );

    expect(onChange).toHaveBeenCalledWith('popular');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
