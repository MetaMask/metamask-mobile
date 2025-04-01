import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NetworkConnectMultiSelector from './NetworkConnectMultiSelector';
import Engine from '../../../../core/Engine';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../../../e2e/selectors/Browser/NetworkConnectMultiSelector.selectors';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectEvmChainId,
} from '../../../../selectors/networkController';
import { Caip25CaveatType } from '@metamask/chain-agnostic-permission';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
    PermissionController: {
      getCaveat: jest.fn(),
      hasCaveat: jest.fn(),
      updateCaveat: jest.fn(),
      grantPermissionsIncremental: jest.fn(),
      revokeAllPermissions: jest.fn(),
    },
  },
}));

// Add mock for react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNetworkConfigurations = {
  'network-1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    rpcEndpoints: [
      {
        url: 'https://mainnet.infura.io/v3',
        networkClientId: 'mainnet',
      },
    ],
    defaultRpcEndpointIndex: 0,
  },
  'network-2': {
    chainId: '0x89',
    name: 'Polygon',
    rpcEndpoints: [
      {
        url: 'https://polygon-rpc.com',
        networkClientId: 'polygon',
      },
    ],
    defaultRpcEndpointIndex: 0,
  },
};

describe('NetworkConnectMultiSelector', () => {
  const defaultProps = {
    isLoading: false,
    onUserAction: jest.fn(),
    urlWithProtocol: 'https://example.com',
    hostname: 'example.com',
    onBack: jest.fn(),
    isRenderedAsBottomSheet: true,
    initialChainId: '0x1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation((selector) => {
      // Use switch statement for better selector matching
      switch (selector) {
        case selectEvmNetworkConfigurationsByChainId:
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

  it('initializes with permitted chains from caveat', () => {
    const permittedChains = ['0x1', '0x89'];
    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockReturnValue({
      value: permittedChains,
    });

    const { getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );

    // Verify networks are selected
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    expect(updateButton.props.disabled).toBeTruthy();
  });

  it('handles network selection correctly', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );

    const network = getByText('Ethereum Mainnet');
    fireEvent.press(network);

    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    expect(updateButton.props.disabled).toBeFalsy();
  });

  it('handles update permissions when networks are selected', async () => {
    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockReturnValue({
      type: Caip25CaveatType,
      value: {
        requiredScopes: {},
        optionalScopes: { 'eip155:1': { accounts: [] } },
        isMultichainOrigin: false,
        sessionProperties: {},
      },
    });
    // TODO: [ffmcgee] perhaps delegate this test suite to Arthur, the mockNetwork config looks bad
    // we could just mock the multichain util function to return what we want, but yeah....
    // that extra piece of code I put in, is not needed

    const { getByText, getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );

    // Select a network
    const network = getByText('Ethereum Mainnet');
    fireEvent.press(network);

    // Press update button
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(Engine.context.PermissionController.updateCaveat).toHaveBeenCalled();
    expect(defaultProps.onUserAction).toHaveBeenCalled();
  });

  it('shows disconnect button when no networks are selected', () => {
    const { getByTestId, getAllByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );

    // First select all networks
    const [selectAllCheckbox] = getAllByTestId(
      ConnectedAccountsSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON,
    );
    fireEvent.press(selectAllCheckbox);

    // Then deselect all networks
    fireEvent.press(selectAllCheckbox);

    // Now check for disconnect button
    const disconnectButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    expect(disconnectButton).toBeTruthy();

    fireEvent.press(disconnectButton);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('handles onNetworksSelected callback when provided', () => {
    const onNetworksSelected = jest.fn();
    const { getByText, getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector
        {...defaultProps}
        onNetworksSelected={onNetworksSelected}
      />,
    );

    // Select a network
    const network = getByText('Ethereum Mainnet');
    fireEvent.press(network);

    // Press update button
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(onNetworksSelected).toHaveBeenCalled();
  });

  it('handles errors when getting permitted chains', () => {
    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockImplementation(() => {
      throw new Error('Test error');
    });

    const { getByTestId } = renderWithProvider(
      <NetworkConnectMultiSelector {...defaultProps} />,
    );

    // Should still render without crashing
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    expect(updateButton.props.disabled).toBeTruthy();
  });
});
