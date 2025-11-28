import React from 'react';
import { initialState } from '../../_mocks_/initialState';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeSourceNetworkSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { setSelectedSourceChainIds } from '../../../../../core/redux/slices/bridge';
import { BridgeSourceNetworkSelectorSelectorsIDs } from '../../../../../../e2e/selectors/Bridge/BridgeSourceNetworkSelector.selectors';
import { cloneDeep } from 'lodash';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BtcScope, SolScope } from '@metamask/keyring-api';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSelectedSourceChainIds: jest.fn(actual.setSelectedSourceChainIds),
    setSourceToken: jest.fn(actual.setSourceToken),
  };
});

jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: jest.fn(() => ({
    onSetRpcTarget: jest.fn().mockResolvedValue(undefined),
    onNetworkChange: jest.fn(),
  })),
}));

describe('BridgeSourceNetworkSelector', () => {
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and displays networks', async () => {
    const { getByText, toJSON } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Header should be visible
    expect(getByText('Select network')).toBeTruthy();

    // Networks should be visible with fiat values
    await waitFor(() => {
      expect(getByText('Ethereum Mainnet')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();

      // Check for fiat values
      // Optimism: 20 ETH * $2000 + 3 TOKEN3 * 8 ETH * $2000 = $40,000 + $48,000 = $88,000
      expect(getByText('$22600')).toBeTruthy();

      // Ethereum: 3 ETH * $2000 + 1 TOKEN1 * 10 ETH * $2000 + 2 TOKEN2 * 5 ETH * $2000 = $6,000 + $20,000 + $20,000 = $46,000
      expect(getByText('$12000')).toBeTruthy();
    });

    // "Select all networks" button should be visible
    expect(getByText('Deselect all')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles network selection toggle correctly', async () => {
    const { getAllByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Initially both networks should be selected
    const ethereum = getAllByTestId(`checkbox-${mockChainId}`);
    const ethereumCheckbox = getAllByTestId(`checkbox-${mockChainId}`)[0];
    const optimism = getAllByTestId(`checkbox-${optimismChainId}`);

    // Check that both checkboxes are initially checked
    expect(ethereum.length).toBe(2);
    expect(optimism.length).toBe(2);

    // Uncheck Ethereum network
    fireEvent.press(ethereumCheckbox);

    // Now Ethereum should be unchecked
    const ethereumAfter = getAllByTestId(`checkbox-${mockChainId}`);
    expect(ethereumAfter.length).toBe(1);

    // Optimism should still be checked
    const optimismAfter = getAllByTestId(`checkbox-${optimismChainId}`);
    expect(optimismAfter.length).toBe(2);
  });

  it('handles "select all" and "deselect all" toggle correctly', async () => {
    const { getAllByTestId, getByText, queryByText } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Initially should show "Deselect all networks" since all networks are selected
    expect(getByText('Deselect all')).toBeTruthy();

    // Click "Deselect all networks"
    const allNetworksToggle = getByText('Deselect all');
    fireEvent.press(allNetworksToggle);

    // Now both networks should be unchecked
    const ethereum = getAllByTestId(`checkbox-${mockChainId}`);
    const optimism = getAllByTestId(`checkbox-${optimismChainId}`);

    expect(ethereum.length).toBe(1);
    expect(optimism.length).toBe(1);

    // Button should now say "Select all networks"
    expect(getByText('Select all')).toBeTruthy();
    expect(queryByText('Deselect all')).toBeNull();

    // Click "Select all networks"
    fireEvent.press(allNetworksToggle);

    // Now both networks should be checked again
    const ethereumAfter = getAllByTestId(`checkbox-${mockChainId}`);
    const optimismAfter = getAllByTestId(`checkbox-${optimismChainId}`);

    expect(ethereumAfter.length).toBe(2);
    expect(optimismAfter.length).toBe(2);

    expect(ethereumAfter.length).toBe(2);
    expect(optimismAfter.length).toBe(2);

    // Button should now say "Deselect all networks" again
    expect(getByText('Deselect all')).toBeTruthy();
    expect(queryByText('Select all')).toBeNull();
  });

  it('applies selected networks when clicking Apply button', async () => {
    const { getAllByTestId, getByText } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Uncheck Ethereum network
    const ethereumCheckbox = getAllByTestId(`checkbox-${mockChainId}`)[0];
    fireEvent.press(ethereumCheckbox);

    // Click Apply button
    const applyButton = getByText('Apply');
    fireEvent.press(applyButton);

    // Wait for async operations to complete
    await waitFor(() => {
      // Should call setSelectedSourceChainIds with just Optimism chainId
      expect(setSelectedSourceChainIds).toHaveBeenCalledWith([
        optimismChainId,
        SolScope.Mainnet,
        BtcScope.Mainnet,
      ]);

      // Should navigate back
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    const closeButton = getByTestId('bridge-network-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('disables Apply button when no networks are selected', async () => {
    const { getByText, getByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Deselect all networks
    const selectAllButton = getByText('Deselect all');
    fireEvent.press(selectAllButton);

    // Apply button should be disabled
    const applyButton = getByTestId(
      BridgeSourceNetworkSelectorSelectorsIDs.APPLY_BUTTON,
    );
    expect(applyButton.props.disabled).toBe(true);
  });

  it('networks should be sorted by fiat value in descending order', async () => {
    const { getAllByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Get all network items
    const networkItems = getAllByTestId(/chain-/);

    // Make sure networks are sorted by fiat value in descending order
    expect(networkItems[0].props.testID).toBe(`chain-${mockChainId}`);
    expect(networkItems[1].props.testID).toBe(`chain-${optimismChainId}`);
  });

  it('renders non-EVM networks', async () => {
    const state = cloneDeep(initialState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
      MultichainNetwork.Solana
    ] = {
      isActiveSrc: true,
      isActiveDest: true,
      isGaslessSwapEnabled: false,
    };

    const { getByText } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state },
    );

    await waitFor(() => {
      expect(getByText('Solana')).toBeTruthy();
      expect(getByText('$30012.75599')).toBeTruthy();
    });
  });

  it('does not render networks if not in chain IDs', async () => {
    const { getByText, queryByText } = renderScreen(
      () => <BridgeSourceNetworkSelector chainIds={[CHAIN_IDS.OPTIMISM]} />,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    await waitFor(() => {
      expect(queryByText('Ethereum Mainnet')).toBeNull();
      expect(getByText('Optimism')).toBeTruthy();
    });
  });

  describe('gas fees sponsored label in source networks', () => {
    it('shows label for sponsored networks only', async () => {
      const state = cloneDeep(initialState);

      type RemoteFlagsWithSponsored =
        typeof state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags & {
          gasFeesSponsoredNetwork: Record<string, boolean>;
        };
      const remoteFlags = state.engine.backgroundState
        .RemoteFeatureFlagController
        .remoteFeatureFlags as RemoteFlagsWithSponsored;
      remoteFlags.gasFeesSponsoredNetwork = {
        [CHAIN_IDS.OPTIMISM]: true,
        [CHAIN_IDS.MAINNET]: false,
      };

      const { getByText, queryAllByText } = renderScreen(
        BridgeSourceNetworkSelector,
        {
          name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
        },
        { state },
      );

      await waitFor(() => {
        expect(getByText('Ethereum Mainnet')).toBeTruthy();
        expect(getByText('Optimism')).toBeTruthy();

        const labels = queryAllByText(strings('networks.no_network_fee'));
        expect(labels.length).toBe(1);
      });
    });

    it('omits label when sponsorship map is empty', async () => {
      const state = cloneDeep(initialState);

      type RemoteFlagsWithSponsoredEmpty =
        typeof state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags & {
          gasFeesSponsoredNetwork: Record<string, boolean>;
        };
      const remoteFlagsEmpty = state.engine.backgroundState
        .RemoteFeatureFlagController
        .remoteFeatureFlags as RemoteFlagsWithSponsoredEmpty;
      remoteFlagsEmpty.gasFeesSponsoredNetwork = {};

      const { getByText, queryByText } = renderScreen(
        BridgeSourceNetworkSelector,
        {
          name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
        },
        { state },
      );

      await waitFor(() => {
        expect(getByText('Ethereum Mainnet')).toBeTruthy();
        expect(getByText('Optimism')).toBeTruthy();
        expect(queryByText(strings('networks.no_network_fee'))).toBeNull();
      });
    });
  });
});
