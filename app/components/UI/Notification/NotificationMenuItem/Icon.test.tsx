// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Notifications team directory
import React from 'react';
import { Linking } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationIcon from './Icon';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

import SVG_ETH_LOGO_PATH from '../../../../component-library/components/Icons/Icon/assets/ethereum.svg';
import type { RootState } from '../../../../reducers';

Linking.openURL = jest.fn(() => Promise.resolve('opened https://metamask.io!'));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
} as unknown as RootState;

describe('NotificationIcon', () => {
  const walletNotification = {
    badgeIcon: IconName.Send2,
    imageUrl: SVG_ETH_LOGO_PATH,
  };

  it('matches snapshot when icon is provided', () => {
    const { toJSON } = renderWithProvider(
      <NotificationIcon
        image={{ url: walletNotification.imageUrl.name }}
        badgeIcon={walletNotification.badgeIcon}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
