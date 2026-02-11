import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NetworkConnectMultiSelector from './NetworkConnectMultiSelector';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../NetworkConnectMultiSelector.testIds';
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';
import {
  selectNetworkConfigurationsByCaipChainId,
  selectEvmChainId,
} from '../../../../selectors/networkController';
import { CaipChainId } from '@metamask/utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Add mock for react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    rpcEndpoints: [
      {
        url: 'https://mainnet.infura.io/v3',
        networkClientId: 'mainnet',
      },
    ],
    defaultRpcEndpointIndex: 0,
    caipChainId: 'eip155:1',
  },
  'eip155:137': {
    chainId: '0x89',
    name: 'Polygon',
    rpcEndpoints: [
      {
        url: 'https://polygon-rpc.com',
        networkClientId: 'polygon',
      },
    ],
    defaultRpcEndpointIndex: 0,
    caipChainId: 'eip155:137',
  },
};

describe('NetworkConnectMultiSelector', () => {
  const defaultProps = {
    isLoading: false,
    hostname: 'example.com',
    onSubmit: jest.fn(),
    onBack: jest.fn(),
    isRenderedAsBottomSheet: true,
    defaultSelectedChainIds: ['eip155:1' as CaipChainId],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation((selector) => {
      // Use switch statement for better selector matching
      switch (selector) {
        case selectNetworkConfigurationsByCaipChainId:
          return mockNetworkConfigurations;
        case selectEvmChainId:
          return '0x1';
        default:
          return undefined;
      }
    });
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('disables the select all button when loading', () => {
    const { getByTestId, getAllByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} isLoading />,
    );

    const selectAllbutton = getAllByTestId(
      ConnectedAccountsSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON,
    );
    fireEvent.press(selectAllbutton[0]);

    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['eip155:1']);
  });

  it('handles the select all button when not loading', () => {
    const { getByTestId, getAllByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector
        {...defaultProps}
        defaultSelectedChainIds={['eip155:1', 'eip155:137']}
      />,
    );

    const selectAllbutton = getAllByTestId(
      ConnectedAccountsSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON,
    );
    fireEvent.press(selectAllbutton[0]);
    fireEvent.press(selectAllbutton[0]);

    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith([
      'eip155:1',
      'eip155:137',
    ]);
  });

  it('handles network selection correctly', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );

    const newNetwork = getByText('Polygon');
    fireEvent.press(newNetwork);

    // tests removal of an already selected network
    const exstingNetwork = getByText('Ethereum Mainnet');
    fireEvent.press(exstingNetwork);

    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['eip155:137']);
  });

  it('shows update button when some networks are selected', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector
        {...defaultProps}
        defaultSelectedChainIds={['eip155:1']}
      />,
    );
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    expect(updateButton).toBeTruthy();
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['eip155:1']);
  });

  it('shows disconnect button when no networks are selected', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector
        {...defaultProps}
        defaultSelectedChainIds={[]}
      />,
    );

    const disconnectButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    expect(disconnectButton).toBeTruthy();

    fireEvent.press(disconnectButton);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith([]);
  });
});
