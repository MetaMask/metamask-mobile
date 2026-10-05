import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HistoryOnHoldSheet from './HistoryOnHoldSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('HistoryOnHoldSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <HistoryOnHoldSheet isVisible={false} onClose={jest.fn()} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_SHEET),
    ).toBeNull();
  });

  it('renders the on-hold copy and Got it action', () => {
    const { getByTestId } = render(
      <HistoryOnHoldSheet isVisible onClose={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_TITLE),
    ).toHaveTextContent('rewards.kol.history_on_hold_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.history_on_hold_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_GOT_IT),
    ).toBeOnTheScreen();
  });

  it('closes when Got it is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <HistoryOnHoldSheet isVisible onClose={onClose} />,
    );

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_GOT_IT),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
