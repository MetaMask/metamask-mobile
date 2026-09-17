import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CohortFilterSelector } from './CohortFilter';
import { CohortFilterSelectorsIDs } from './Filters.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('CohortFilterSelector', () => {
  it('calls onPress from the cohort chip', () => {
    const onPress = jest.fn();

    renderWithProvider(
      <CohortFilterSelector value="whale" onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId(CohortFilterSelectorsIDs.SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
