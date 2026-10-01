import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { FeedSortFilterSelector } from './FeedSortFilter';
import { FeedSortFilterSelectorsIDs } from './Filters.testIds';

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
