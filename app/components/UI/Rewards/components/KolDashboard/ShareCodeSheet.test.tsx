import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ShareCodeSheet from './ShareCodeSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-qrcode-svg', () => () => null);

jest.mock('../../utils', () => ({
  buildReferralUrl: (code: string) =>
    `https://link.metamask.io/rewards?c=${code}`,
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

describe('ShareCodeSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <ShareCodeSheet
        isVisible={false}
        referralCode="8F3A21"
        onClose={jest.fn()}
      />,
    );

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.SHARE_SHEET)).toBeNull();
  });

  it('renders the sheet when visible', () => {
    const { getByTestId } = render(
      <ShareCodeSheet isVisible referralCode="8F3A21" onClose={jest.fn()} />,
    );

    expect(getByTestId(KOL_DASHBOARD_SELECTORS.SHARE_SHEET)).toBeOnTheScreen();
  });

  it('hosts the sheet in a full-screen transparent modal so the overlay covers the dashboard', () => {
    const { UNSAFE_getByType } = render(
      <ShareCodeSheet isVisible referralCode="8F3A21" onClose={jest.fn()} />,
    );

    const modal = UNSAFE_getByType(Modal);

    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it.each([
    ['share via', KOL_DASHBOARD_SELECTORS.SHARE_VIA],
    ['copy link', KOL_DASHBOARD_SELECTORS.COPY_LINK],
    ['messages', KOL_DASHBOARD_SELECTORS.SHARE_MESSAGES],
    ['telegram', KOL_DASHBOARD_SELECTORS.SHARE_TELEGRAM],
  ])('renders the %s action', (_name, testId) => {
    const { getByTestId } = render(
      <ShareCodeSheet isVisible referralCode="8F3A21" onClose={jest.fn()} />,
    );

    expect(getByTestId(testId)).toBeOnTheScreen();
  });

  it('copies the share URL and shows a green check on Copy Link', () => {
    const { getByTestId, queryByTestId } = render(
      <ShareCodeSheet isVisible referralCode="8F3A21" onClose={jest.fn()} />,
    );

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.COPY_LINK_CHECK)).toBeNull();

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.COPY_LINK));

    expect(Clipboard.setString).toHaveBeenCalledWith(
      'https://link.metamask.io/rewards?c=8F3A21',
    );
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.COPY_LINK_CHECK),
    ).toBeOnTheScreen();
  });
});
