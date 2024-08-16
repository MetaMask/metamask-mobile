import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';
import { Props } from './NotificationsSettings.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  notificationsSettings: {
    isEnabled: true,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const setOptions = jest.fn();

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

describe('NotificationsSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsSettings
        navigation={
          {
            setOptions,
          } as unknown as Props['navigation']
        }
        route={{} as unknown as Props['route']}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
