import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { RankingFilterSheet } from './RankingFilter';
import {
  RankingFilterSelectorsIDs,
  getRankingFilterOptionTestId,
} from './Filters.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('RankingFilterSheet', () => {
  it('selects volume from the ranking sheet', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();

    renderWithProvider(
      <RankingFilterSheet
        isOpen
        value="pnl"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getRankingFilterOptionTestId('volume')));

    expect(onChange).toHaveBeenCalledWith('volume');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns null while closed', () => {
    renderWithProvider(
      <RankingFilterSheet
        isOpen={false}
        value="pnl"
        onChange={jest.fn()}
        onClose={jest.fn()}
        sheetTestID={RankingFilterSelectorsIDs.SHEET}
      />,
    );

    expect(screen.queryByTestId(RankingFilterSelectorsIDs.SHEET)).toBeNull();
  });
});
