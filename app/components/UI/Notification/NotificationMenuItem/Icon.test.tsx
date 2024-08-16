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

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));

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
