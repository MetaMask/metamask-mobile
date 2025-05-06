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
import { updatePermittedChains } from '../../../../core/Permissions';

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

jest.mock('../../../../core/Permissions', () => ({
  ...jest.requireActual('../../../../core/Permissions'),
  updatePermittedChains: jest.fn(),
}));

const mockAddPermittedChains = updatePermittedChains as jest.Mock;

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
    /**
     * This is a requirement for now because mocking the entire module globally at the top of the file makes 'renders correctly' test break,
     * But we need to mock this function specifically for this unit test because the mocked data sends 'network-1' key as the chainId, instead of '0x1'.
     */
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    jest.spyOn(require('@metamask/controller-utils'), 'toHex').mockImplementation((arg) => arg);

    mockAddPermittedChains.mockReturnValue(['0x1']);
    const mockNetworkConfigurationId = Object.keys(
      mockNetworkConfigurations,
    )[0];

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

    expect(updatePermittedChains).toHaveBeenCalledWith(defaultProps.hostname, [
      mockNetworkConfigurationId,
    ], true);
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
