import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TokenFilterBottomSheet } from './TokenFilterBottomSheet';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectAllPopularNetworkConfigurations,
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../../selectors/preferencesController';
import { NETWORK_CHAIN_ID } from '../../../../util/networks/customNetworks';
import { Hex } from '@metamask/utils';
import { enableAllNetworksFilter } from '../util/enableAllNetworksFilter';

import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

const mockNetworks: Record<Hex, NetworkConfiguration> = {
  [NETWORK_CHAIN_ID.MAINNET]: {
    blockExplorerUrls: ['https://etherscan.io'],
    chainId: NETWORK_CHAIN_ID.MAINNET,
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        url: 'https://mainnet.infura.io/v3',
        failoverUrls: [],
        networkClientId: NETWORK_CHAIN_ID.MAINNET,
        type: RpcEndpointType.Custom,
        name: 'Ethereum',
      },
    ],
  },
  [NETWORK_CHAIN_ID.POLYGON]: {
    blockExplorerUrls: ['https://polygonscan.com'],
    chainId: NETWORK_CHAIN_ID.POLYGON,
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Polygon Mainnet',
    nativeCurrency: 'MATIC',
    rpcEndpoints: [
      {
        url: 'https://polygon-rpc.com',
        failoverUrls: [],
        name: 'Polygon',
        networkClientId: NETWORK_CHAIN_ID.POLYGON,
        type: RpcEndpointType.Custom,
      },
    ],
  },
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({ colors: {} })),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const reactNavigationModule = jest.requireActual('@react-navigation/native');
  return {
    ...reactNavigationModule,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  // copied from BottomSheetDialog.test.tsx
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

describe('TokenFilterBottomSheet', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) {
        return '0x1'; // default chain ID
      } else if (selector === selectTokenNetworkFilter) {
        return {}; // default to show all networks
      } else if (selector === selectNetworkConfigurations) {
        return mockNetworks; // default to show all networks
      } else if (selector === selectAllPopularNetworkConfigurations) {
        return mockNetworks; // default to show all networks
      }
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with the default option (All Networks) selected', () => {
    const { queryByText } = render(<TokenFilterBottomSheet />);

    expect(queryByText('Popular networks')).toBeTruthy();
    expect(queryByText('Current Network')).toBeTruthy();
  });

  it('sets filter to All Networks and closes bottom sheet when first option is pressed', async () => {
    const { getByText } = render(<TokenFilterBottomSheet />);

    fireEvent.press(getByText('Popular networks'));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toHaveBeenCalledWith(enableAllNetworksFilter(mockNetworks));
    });
  });

  it('sets filter to Current Network and closes bottom sheet when second option is pressed', async () => {
    const { getByText } = render(<TokenFilterBottomSheet />);

    fireEvent.press(getByText('Current Network'));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toHaveBeenCalledWith({
        '0x1': true,
      });
    });
  });

  it('displays the correct selection based on tokenNetworkFilter', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) {
        return '0x1';
      } else if (selector === selectTokenNetworkFilter) {
        return { '0x1': true }; // filter by current network
      } else if (selector === selectNetworkConfigurations) {
        return mockNetworks;
      } else if (selector === selectAllPopularNetworkConfigurations) {
        return mockNetworks;
      }
      return null;
    });

    const { queryByText } = render(<TokenFilterBottomSheet />);

    expect(queryByText('Current Network')).toBeTruthy();
  });
});
