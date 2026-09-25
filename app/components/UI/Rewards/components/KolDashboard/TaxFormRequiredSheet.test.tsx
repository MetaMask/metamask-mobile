import React from 'react';
import { Linking, Modal } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import TaxFormRequiredSheet from './TaxFormRequiredSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { KOL_TAX_FORM_URL } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const renderSheet = (
  props: Partial<React.ComponentProps<typeof TaxFormRequiredSheet>> = {},
) =>
  render(
    <TaxFormRequiredSheet
      isVisible
      onClose={jest.fn()}
      onContinue={jest.fn()}
      {...props}
    />,
  );

describe('TaxFormRequiredSheet', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns nothing when hidden', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET)).toBeNull();
  });

  it('renders the title, description, and both actions when visible', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_TITLE),
    ).toHaveTextContent('rewards.kol.tax_form_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.tax_form_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_REMIND_LATER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_CONTINUE),
    ).toBeOnTheScreen();
  });

  it('hosts the sheet in a full-screen transparent modal so the overlay covers the dashboard', () => {
    const { UNSAFE_getByType } = renderSheet();

    const modal = UNSAFE_getByType(Modal);

    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('closes without opening the tax form when Not now is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_REMIND_LATER));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens the partner tax form and reports the hand-off when Continue is pressed', () => {
    const onContinue = jest.fn();
    const { getByTestId } = renderSheet({ onContinue });

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_CONTINUE));

    expect(Linking.openURL).toHaveBeenCalledWith(KOL_TAX_FORM_URL);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
