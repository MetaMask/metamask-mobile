import React from 'react';
import { Linking } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationIcon from './Icon';
import { TRIGGER_TYPES } from '../../../../util/notifications';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';

Linking.openURL = jest.fn(() => Promise.resolve('opened https://metamask.io!'));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

describe('NotificationIcon', () => {
  const styles = {
    foxWrapper: {},
    fox: {},
    nftLogo: {},
    nftPlaceholder: {},
    assetLogo: {},
    assetPlaceholder: {},
    badgeWrapper: {},
    ethLogo: {},
  };

  const announcementNotification = {
    notificationType: TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
    imageUrl:
      'https://github.com/MetaMask/brand-resources/blob/master/SVG/SVG_MetaMask_Icon_Color.svg',
  };

  const walletNotification = {
    notificationType: TRIGGER_TYPES.ERC20_SENT,
    badgeIcon: IconName.Send2,
    imageUrl:
      'https://github.com/MetaMask/brand-resources/blob/master/SVG/SVG_MetaMask_Icon_Color.svg',
  };

  it('matches snapshot with Wallet type', () => {
    const { toJSON } = renderWithProvider(
      <NotificationIcon
        notificationType={walletNotification.notificationType}
        imageUrl={walletNotification.imageUrl}
        badgeIcon={walletNotification.badgeIcon}
        styles={styles}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with Announcement type', () => {
    const { toJSON } = renderWithProvider(
      <NotificationIcon
        notificationType={announcementNotification.notificationType}
        imageUrl={announcementNotification.imageUrl}
        styles={styles}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Fox icon when notification type is FEATURES_ANNOUNCEMENT', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationIcon
        notificationType={announcementNotification.notificationType}
        imageUrl={announcementNotification.imageUrl}
        styles={styles}
      />,
    );

    const foxIcon = getByTestId(CommonSelectorsIDs.FOX_ICON);
    expect(foxIcon).toBeTruthy();
  });
});
