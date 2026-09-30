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
      onClose={jest.fn()}
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
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT).props.value,
    ).toBe('8F3A21');
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

  it('uppercases the typed code and drops separators', () => {
    const { getByTestId } = renderSheet({ referralCode: '' });

    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'ab-12cd',
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT).props.value,
    ).toBe('AB12CD');
  });

  it('keeps accept disabled until the code is complete', () => {
    const onAccept = jest.fn();
    const { getByTestId } = renderSheet({ onAccept, referralCode: '' });

    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'ab12',
    );
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT));

    expect(onAccept).not.toHaveBeenCalled();
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

    fireEvent.changeText(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT),
      'ab12cd',
    );
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('AB12CD'));
  });

  it('declines from the decline button', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onAccept, onDecline, onClose });

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_DECLINE));

    await waitFor(() => expect(onDecline).toHaveBeenCalled());
    expect(onAccept).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without declining from the close button', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onAccept, onDecline, onClose });

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_CLOSE));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onDecline).not.toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('closes without declining on hardware back', () => {
    const onDecline = jest.fn();
    const onClose = jest.fn();
    const { UNSAFE_getByType } = renderSheet({ onDecline, onClose });

    const modal = UNSAFE_getByType(Modal);
    modal.props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });
});
