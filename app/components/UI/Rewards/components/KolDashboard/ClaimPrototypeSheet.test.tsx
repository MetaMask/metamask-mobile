import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ClaimPrototypeSheet from './ClaimPrototypeSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('ClaimPrototypeSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <ClaimPrototypeSheet
        isVisible={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_SHEET),
    ).toBeNull();
  });

  it('renders the four tax-state options', () => {
    const { getByTestId } = render(
      <ClaimPrototypeSheet
        isVisible
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_FIRST_TIME),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_PENDING),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_APPROVED),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_ELSEWHERE),
    ).toBeOnTheScreen();
  });

  it('reports the selected option', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ClaimPrototypeSheet isVisible onClose={jest.fn()} onSelect={onSelect} />,
    );

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_PENDING),
    );

    expect(onSelect).toHaveBeenCalledWith('usPending');
  });
});
