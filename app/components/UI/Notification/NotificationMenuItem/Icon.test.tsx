import React from 'react';
import { ReactTestInstance } from 'react-test-renderer';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NotificationIcon, { TEST_IDS } from './Icon';
import SVG_ETH_LOGO_PATH from '../../../../component-library/components/Icons/Icon/assets/ethereum.svg';
import { BADGE_WRAPPER_BADGE_TEST_ID } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';

describe('NotificationIcon', () => {
  const walletNotification = {
    badgeIcon: IconName.Send,
    imageUrl: SVG_ETH_LOGO_PATH,
  };

  const badgeTests = [
    {
      hasBadge: true,
      assertion: (elem: ReactTestInstance | null) =>
        expect(elem).toBeOnTheScreen(),
    },
    {
      hasBadge: false,
      assertion: (elem: ReactTestInstance | null) =>
        expect(elem).not.toBeOnTheScreen(),
    },
  ];

  it.each(badgeTests)(
    'manages container rendering when badge is added: $hasBadge',
    ({ hasBadge, assertion }) => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <NotificationIcon
          isRead={false}
          image={{ url: walletNotification.imageUrl.name }}
          badgeIcon={hasBadge ? walletNotification.badgeIcon : undefined}
        />,
      );

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.ICON)).toBeOnTheScreen();
      assertion(queryByTestId(BADGE_WRAPPER_BADGE_TEST_ID));
    },
  );
});
