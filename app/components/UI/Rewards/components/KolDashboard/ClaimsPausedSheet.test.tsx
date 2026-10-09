import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ClaimsPausedSheet from './ClaimsPausedSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('ClaimsPausedSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <ClaimsPausedSheet isVisible={false} onClose={jest.fn()} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_SHEET),
    ).toBeNull();
  });

  it('renders the paused copy and Got it action', () => {
    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_TITLE),
    ).toHaveTextContent('rewards.kol.claims_paused_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.claims_paused_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_GOT_IT),
    ).toBeOnTheScreen();
  });

  it('closes when Got it is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={onClose} />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_GOT_IT));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
