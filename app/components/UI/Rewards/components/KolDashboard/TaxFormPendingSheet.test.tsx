import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TaxFormPendingSheet from './TaxFormPendingSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TaxFormPendingSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <TaxFormPendingSheet isVisible={false} onClose={jest.fn()} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_SHEET),
    ).toBeNull();
  });

  it('renders the pending copy and Got it action', () => {
    const { getByTestId } = render(
      <TaxFormPendingSheet isVisible onClose={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_TITLE),
    ).toHaveTextContent('rewards.kol.tax_form_pending_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.tax_form_pending_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_GOT_IT),
    ).toBeOnTheScreen();
  });

  it('closes when Got it is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TaxFormPendingSheet isVisible onClose={onClose} />,
    );

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_GOT_IT),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
