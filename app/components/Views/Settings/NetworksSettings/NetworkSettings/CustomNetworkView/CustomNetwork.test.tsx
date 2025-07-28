import React from 'react';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import CustomNetwork from './CustomNetwork';
import { CustomNetworkProps } from './CustomNetwork.types';
import { PopularList } from '../../../../../../util/networks/customNetworks';

const getMockState = () => ({ engine: { backgroundState } });

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
});
