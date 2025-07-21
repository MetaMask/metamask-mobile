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
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../util/networks';

import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

// Mock the feature flag
jest.mock('../../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
  getNetworkImageSource: jest.fn(() => 'https://mock-image-url.com'),
}));

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

jest.mock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
    useNetworksByNamespace: () => ({
      networks: [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          caipChainId: 'eip155:1',
          isSelected: false,
          imageSource:
            'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
          networkTypeOrRpcUrl: 'https://mock-url.com',
        },
      ],
    }),
    NetworkType: {
      Popular: 'popular',
      Custom: 'custom',
    },
  }),
);

const mockSelectNetwork = jest.fn();
jest.mock('../../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
    selectNetwork: mockSelectNetwork,
  }),
}));

describe('TokenFilterBottomSheet', () => {
  const mockIsRemoveGlobalNetworkSelectorEnabled =
    isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
      typeof isRemoveGlobalNetworkSelectorEnabled
    >;

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
    mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with the default option (All Networks) selected', () => {
    const { queryByText } = render(<TokenFilterBottomSheet />);

    expect(queryByText('Popular networks')).toBeTruthy();
    expect(queryByText('Current network')).toBeTruthy();
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

    fireEvent.press(getByText('Current network'));

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

    expect(queryByText('Current network')).toBeTruthy();
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled', () => {
    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('calls selectNetwork when Popular Networks option is pressed', async () => {
        const { getByText } = render(<TokenFilterBottomSheet />);

        fireEvent.press(getByText('Popular networks'));

        await waitFor(() => {
          expect(
            Engine.context.PreferencesController.setTokenNetworkFilter,
          ).toHaveBeenCalledWith(enableAllNetworksFilter(mockNetworks));
          expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
        });
      });

      it('calls selectNetwork when Current Network option is pressed', async () => {
        const { getByText } = render(<TokenFilterBottomSheet />);

        fireEvent.press(getByText('Current network'));

        await waitFor(() => {
          expect(
            Engine.context.PreferencesController.setTokenNetworkFilter,
          ).toHaveBeenCalledWith({
            '0x1': true,
          });
          expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
        });
      });

      it('calls selectNetwork with correct chainId for different network', async () => {
        (useSelector as jest.Mock).mockImplementation((selector) => {
          if (selector === selectChainId) {
            return '0x89'; // Polygon chain ID
          } else if (selector === selectTokenNetworkFilter) {
            return {};
          } else if (selector === selectNetworkConfigurations) {
            return mockNetworks;
          } else if (selector === selectAllPopularNetworkConfigurations) {
            return mockNetworks;
          }
          return null;
        });

        const { getByText } = render(<TokenFilterBottomSheet />);

        fireEvent.press(getByText('Current network'));

        await waitFor(() => {
          expect(
            Engine.context.PreferencesController.setTokenNetworkFilter,
          ).toHaveBeenCalledWith({
            '0x89': true,
          });
          expect(mockSelectNetwork).toHaveBeenCalledWith('0x89');
        });
      });
    });

    describe('when feature flag is disabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      });

      it('does not call selectNetwork when Popular Networks option is pressed', async () => {
        const { getByText } = render(<TokenFilterBottomSheet />);

        fireEvent.press(getByText('Popular networks'));

        await waitFor(() => {
          expect(
            Engine.context.PreferencesController.setTokenNetworkFilter,
          ).toHaveBeenCalledWith(enableAllNetworksFilter(mockNetworks));
          expect(mockSelectNetwork).not.toHaveBeenCalled();
        });
      });

      it('does not call selectNetwork when Current Network option is pressed', async () => {
        const { getByText } = render(<TokenFilterBottomSheet />);

        fireEvent.press(getByText('Current network'));

        await waitFor(() => {
          expect(
            Engine.context.PreferencesController.setTokenNetworkFilter,
          ).toHaveBeenCalledWith({
            '0x1': true,
          });
          expect(mockSelectNetwork).not.toHaveBeenCalled();
        });
      });
    });
  });
});
