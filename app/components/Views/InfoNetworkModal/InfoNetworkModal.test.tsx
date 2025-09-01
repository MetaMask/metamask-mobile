import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import InfoNetworkModal from './InfoNetworkModal';
import { mockNetworkState } from '../../../util/test/network';
import { RpcEndpointType } from '@metamask/network-controller';
import { backgroundState } from '../../../util/test/initial-root-state';

// Mock the navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useIsFocused: () => ({
      isFocused: true,
    }),
  };
});

// Mock the NetworkInfo component
jest.mock('../../UI/NetworkInfo', () => () => 'NetworkInfo');

jest.mock('../../UI/Bridge/hooks/useIsOnBridgeRoute', () => ({
  useIsOnBridgeRoute: jest.fn().mockReturnValue(false),
}));

const initialState = {
  modals: {
    infoNetworkModalVisible: true,
  },
  networkOnboarded: {
    networkOnboardedState: {},
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: mockNetworkState({
        chainId: '0x1',
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
        type: RpcEndpointType.Infura,
      }),
      MultichainNetworkController: {
        ...backgroundState.MultichainNetworkController,
        isEvmSelected: false,
      },
    },
  },
};

describe('InfoNetworkModal', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<InfoNetworkModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
