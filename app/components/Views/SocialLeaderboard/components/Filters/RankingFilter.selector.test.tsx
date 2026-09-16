import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { RankingFilterSelector } from './RankingFilter';
import { RankingFilterSelectorsIDs } from './Filters.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('RankingFilterSelector', () => {
  it('calls onPress from the ranking chip', () => {
    const onPress = jest.fn();

    renderWithProvider(
      <RankingFilterSelector value="volume" onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId(RankingFilterSelectorsIDs.SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
