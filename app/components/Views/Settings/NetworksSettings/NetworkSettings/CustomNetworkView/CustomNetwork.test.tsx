import React from 'react';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import CustomNetwork from './CustomNetwork';
import { CustomNetworkProps, type Network } from './CustomNetwork.types';
import { PopularList } from '../../../../../../util/networks/customNetworks';
import { selectAdditionalNetworksBlacklistFeatureFlag } from '../../../../../../selectors/featureFlagController/networkBlacklist';
import { toHex } from '@metamask/controller-utils';

// Mock the blacklist selector
jest.mock(
  '../../../../../../selectors/featureFlagController/networkBlacklist',
  () => ({
    selectAdditionalNetworksBlacklistFeatureFlag: jest.fn(),
  }),
);

const getMockState = (blacklistedChainIds: string[] = []) => {
  // Set up the mock selector to return the blacklist
  (
    selectAdditionalNetworksBlacklistFeatureFlag as unknown as jest.Mock
  ).mockReturnValue(blacklistedChainIds);

  return { engine: { backgroundState } };
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('CustomNetwork component', () => {
  const getMockCustomNetworkProps = (
    overrides?: Partial<CustomNetworkProps>,
  ) => {
    const mockCloseNetworkModal = jest.fn();
    const mockShowNetworkModal = jest.fn();
    const mockCustomNetworkProps: CustomNetworkProps = {
      showPopularNetworkModal: false,
      isNetworkModalVisible: false,
      closeNetworkModal: mockCloseNetworkModal,
      selectedNetwork: {
        chainId: '0x1',
        nickname: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/your-api-key',
        ticker: 'ETH',
        rpcPrefs: {
          blockExplorerUrl: 'https://etherscan.io',
        },
      },
      showNetworkModal: mockShowNetworkModal,
      shouldNetworkSwitchPopToWallet: false,
      ...overrides,
    };
    return mockCustomNetworkProps;
  };

  it('filters out CAIP-2 networks when showing all networks (included added networks)', () => {
    const props = getMockCustomNetworkProps({ showAddedNetworks: true });
    const mockState = getMockState();
    const { getByText, queryByText } = renderWithProvider(
      <CustomNetwork {...props} />,
      {
        state: mockState,
      },
    );

    const additionalNetworksVisible = PopularList.map((p) => p.nickname);
    additionalNetworksVisible.forEach((name) => {
      expect(getByText(name)).toBeOnTheScreen();
    });

    Object.values(
      Object.values(
        mockState.engine.backgroundState.MultichainNetworkController
          .multichainNetworkConfigurationsByChainId,
      ),
    ).forEach((n) => {
      expect(queryByText(n.name)).not.toBeOnTheScreen();
    });
  });

  it('hides blacklisted networks from the list', () => {
    const props = getMockCustomNetworkProps({ showAddedNetworks: true });
    const blacklistedChainIds = [toHex('43114'), toHex('42161')]; // Avalanche and Arbitrum
    const mockState = getMockState(blacklistedChainIds);
    const { queryByText } = renderWithProvider(<CustomNetwork {...props} />, {
      state: mockState,
    });

    // These networks should be hidden
    expect(queryByText('Avalanche')).not.toBeOnTheScreen();
    expect(queryByText('Arbitrum')).not.toBeOnTheScreen();

    // Other networks should still be visible
    expect(queryByText('Base')).toBeOnTheScreen();
    expect(queryByText('Polygon')).toBeOnTheScreen();
  });

  it('shows all networks when blacklist is empty', () => {
    const props = getMockCustomNetworkProps({ showAddedNetworks: true });
    const mockState = getMockState([]);
    const { queryByText } = renderWithProvider(<CustomNetwork {...props} />, {
      state: mockState,
    });

    // All networks should be visible
    expect(queryByText('Avalanche')).toBeOnTheScreen();
    expect(queryByText('Arbitrum')).toBeOnTheScreen();
    expect(queryByText('Base')).toBeOnTheScreen();
  });

  it('renders or hides "No network fee" label based on sponsorship flag', () => {
    const customNetworksList: Network[] = [
      {
        chainId: '0x38',
        nickname: 'BNB Chain',
        rpcPrefs: { blockExplorerUrl: 'https://bscscan.com' },
        rpcUrl: 'https://bsc-dataseed.binance.org',
        ticker: 'BNB',
      },
      {
        chainId: '0xa4b1',
        nickname: 'Arbitrum',
        rpcPrefs: { blockExplorerUrl: 'https://arbiscan.io' },
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        ticker: 'ETH',
      },
    ];

    const props = getMockCustomNetworkProps({
      showAddedNetworks: true,
      customNetworksList,
    });

    // One state with mixed sponsorship flags
    const state = {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: {
              ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
              gasFeesSponsoredNetwork: {
                '0x38': true,
                '0xa4b1': false,
              },
            },
          },
        },
      },
    };

    const { getByText, getAllByText } = renderWithProvider(
      <CustomNetwork {...props} />,
      { state },
    );

    expect(getByText('BNB Chain')).toBeOnTheScreen();
    expect(getByText('Arbitrum')).toBeOnTheScreen();

    expect(getAllByText('No network fee').length).toBe(1);
  });
});
