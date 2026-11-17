import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CohortFilterSheet } from './CohortFilter';
import {
  CohortFilterSelectorsIDs,
  getCohortFilterOptionTestId,
} from './Filters.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('CohortFilterSheet', () => {
  it('prefixes shrimp, dolphin, and whale rows with emojis in the sheet', () => {
    renderWithProvider(
      <CohortFilterSheet
        isOpen
        value="all"
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(getCohortFilterOptionTestId('shrimp')),
    ).toHaveTextContent(
      '🦐 social_leaderboard.shell.filters.trader_cohort.shrimp',
    );
    expect(
      screen.getByTestId(getCohortFilterOptionTestId('dolphin')),
    ).toHaveTextContent(
      '🐬 social_leaderboard.shell.filters.trader_cohort.dolphin',
    );
    expect(
      screen.getByTestId(getCohortFilterOptionTestId('whale')),
    ).toHaveTextContent(
      '🐳 social_leaderboard.shell.filters.trader_cohort.whale',
    );
  });

  it('calls onChange and onClose when a cohort is selected', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();

    renderWithProvider(
      <CohortFilterSheet
        isOpen
        value="all"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getCohortFilterOptionTestId('whale')));

    expect(onChange).toHaveBeenCalledWith('whale');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns null while closed', () => {
    renderWithProvider(
      <CohortFilterSheet
        isOpen={false}
        value="all"
        onChange={jest.fn()}
        onClose={jest.fn()}
        sheetTestID={CohortFilterSelectorsIDs.SHEET}
      />,
    );

    expect(screen.queryByTestId(CohortFilterSelectorsIDs.SHEET)).toBeNull();
  });
});
