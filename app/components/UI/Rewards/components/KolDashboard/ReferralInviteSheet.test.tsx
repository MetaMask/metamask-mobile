import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ReferralInviteSheet from './ReferralInviteSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const renderSheet = (
  props: Partial<React.ComponentProps<typeof ReferralInviteSheet>> = {},
) =>
  render(
    <ReferralInviteSheet
      isVisible
      referralCode="8F3A21"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      {...props}
    />,
  );

describe('ReferralInviteSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.INVITE_SHEET)).toBeNull();
  });

  it('renders the invite with the referral code and both actions', () => {
    const { getByTestId } = renderSheet();

    expect(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_SHEET)).toBeOnTheScreen();
    expect(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE)).toHaveTextContent(
      '8F3A21',
    );
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_DECLINE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT),
    ).toBeOnTheScreen();
  });

  it('hosts the sheet in a full-screen transparent modal so the overlay covers the dashboard', () => {
    const { UNSAFE_getByType } = renderSheet();

    const modal = UNSAFE_getByType(Modal);

    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('swaps the code for an input when a different code is requested', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_EDIT_CODE));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
    ).toBeOnTheScreen();
    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE)).toBeNull();
  });

  it('uppercases the typed code and confirms it once it is complete', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_EDIT_CODE));
    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'ab12',
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_COMPLETE),
    ).toBeNull();

    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'ab12cd',
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_COMPLETE),
    ).toBeOnTheScreen();
  });

  it('restores the original code when the edit is cancelled', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_EDIT_CODE));
    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'zz99',
    );
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CANCEL_EDIT));

    expect(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE)).toHaveTextContent(
      '8F3A21',
    );
  });

  it('accepts with the code currently shown', async () => {
    const onAccept = jest.fn();
    const { getByTestId } = renderSheet({ onAccept });

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('8F3A21'));
  });

  it('accepts with an edited code', async () => {
    const onAccept = jest.fn();
    const { getByTestId } = renderSheet({ onAccept });

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_EDIT_CODE));
    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'ab12cd',
    );
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('AB12CD'));
  });

  it.each([
    ['the decline button', KOL_DASHBOARD_SELECTORS.INVITE_DECLINE],
    ['the close button', KOL_DASHBOARD_SELECTORS.INVITE_CLOSE],
  ])('declines from %s', async (_name, testId) => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const { getByTestId } = renderSheet({ onAccept, onDecline });

    fireEvent.press(getByTestId(testId));

    await waitFor(() => expect(onDecline).toHaveBeenCalled());
    expect(onAccept).not.toHaveBeenCalled();
  });
});
