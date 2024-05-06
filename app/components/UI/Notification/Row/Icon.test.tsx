import React from 'react';
import { Linking } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationIcon from './Icon';
import { TRIGGER_TYPES } from '../../../../util/notifications';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';

import SVG_MM_LOGO_PATH from '../../../../images/fox.svg';
import SVG_ETH_LOGO_PATH from '../../../../component-library/components/Icons/Icon/assets/ethereum.svg';

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
    imageUrl: SVG_MM_LOGO_PATH,
  };

  const walletNotification = {
    notificationType: TRIGGER_TYPES.ERC20_SENT,
    badgeIcon: IconName.Send2,
    imageUrl: SVG_ETH_LOGO_PATH,
  };

  it('matches snapshot with Wallet type', () => {
    const { toJSON } = renderWithProvider(
      <NotificationIcon
        notificationType={walletNotification.notificationType}
        imageUrl={walletNotification.imageUrl.name}
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
        imageUrl={announcementNotification.imageUrl.name}
        styles={styles}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Fox icon when notification type is FEATURES_ANNOUNCEMENT', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationIcon
        notificationType={announcementNotification.notificationType}
        imageUrl={announcementNotification.imageUrl.name}
        styles={styles}
      />,
    );

    const foxIcon = getByTestId(CommonSelectorsIDs.FOX_ICON);
    expect(foxIcon).toBeTruthy();
  });
});
