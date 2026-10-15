import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsPreviewSheet from './RewardsPreviewSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const renderSheet = (
  props: Partial<React.ComponentProps<typeof RewardsPreviewSheet>> = {},
) =>
  render(
    <RewardsPreviewSheet
      isVisible
      isMainDashboardSelected
      onClose={jest.fn()}
      onSelect={jest.fn()}
      {...props}
    />,
  );

describe('RewardsPreviewSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_SHEET)).toBeNull();
  });

  it('renders the title and five preview rows when visible', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_TITLE),
    ).toHaveTextContent('rewards.kol.preview_state_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_MAIN_DASHBOARD),
    ).toHaveTextContent('rewards.kol.preview_main_dashboard');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_INVITED_EXISTING_USER),
    ).toHaveTextContent('rewards.kol.preview_invited_existing_user');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_CLAIMS_ON_HOLD),
    ).toHaveTextContent('rewards.kol.preview_claims_on_hold');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_CLAIMS_PAUSED),
    ).toHaveTextContent('rewards.kol.preview_claims_paused');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_RESET_CLAIM),
    ).toHaveTextContent('rewards.kol.preview_reset_claim');
  });

  it('marks Main dashboard selected while that dashboard is showing', () => {
    const { getByTestId } = renderSheet({ isMainDashboardSelected: true });

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_MAIN_DASHBOARD).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it('clears the Main dashboard check while another persona is showing', () => {
    const { getByTestId } = renderSheet({ isMainDashboardSelected: false });

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.PREVIEW_MAIN_DASHBOARD).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });

  it.each([
    [KOL_DASHBOARD_SELECTORS.PREVIEW_MAIN_DASHBOARD, 'mainDashboard'],
    [
      KOL_DASHBOARD_SELECTORS.PREVIEW_INVITED_EXISTING_USER,
      'invitedExistingUser',
    ],
    [KOL_DASHBOARD_SELECTORS.PREVIEW_CLAIMS_ON_HOLD, 'claimsOnHold'],
    [KOL_DASHBOARD_SELECTORS.PREVIEW_CLAIMS_PAUSED, 'claimsPaused'],
    [KOL_DASHBOARD_SELECTORS.PREVIEW_RESET_CLAIM, 'resetClaim'],
  ] as const)('calls onSelect with %s', (testID, action) => {
    const onSelect = jest.fn();
    const { getByTestId } = renderSheet({ onSelect });

    fireEvent.press(getByTestId(testID));

    expect(onSelect).toHaveBeenCalledWith(action);
  });
});
