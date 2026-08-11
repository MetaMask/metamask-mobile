/**
 * Integration tests — useNetworkOperations Shape B (Test 2A).
 *
 * Exercises the real hook against Shape A NetworkController /
 * NetworkEnablementController / MultichainNetworkController instances via
 * the Engine context shim in `networks-flow`.
 */

import { act } from '@testing-library/react-native';
import { KnownCaipNamespace } from '@metamask/utils';

import { buildNetworksFlowHarness } from '../../../../../../tests/integration/harnesses/networks/networks-flow';
import { HARNESS_CUSTOM_CHAIN_ID } from '../../../../../../tests/integration/harnesses/networks/networks';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import { useNetworkOperations } from './useNetworkOperations';

const customNetworkForm: NetworkFormState = {
  rpcUrl: 'https://rpc.gnosischain.com',
  failoverRpcUrls: undefined,
  rpcName: 'Gnosis RPC',
  rpcUrlForm: '',
  rpcNameForm: '',
  rpcUrls: [
    {
      url: 'https://rpc.gnosischain.com',
      name: 'Gnosis RPC',
      type: 'custom',
    },
  ],
  blockExplorerUrls: ['https://gnosisscan.io'],
  selectedRpcEndpointIndex: 0,
  blockExplorerUrl: 'https://gnosisscan.io',
  blockExplorerUrlForm: undefined,
  nickname: 'Gnosis',
  chainId: '100',
  ticker: 'xDAI',
  editable: true,
  addMode: true,
};

const defaultSaveParams = () => ({
  enableAction: true,
  disabledByChainId: false,
  disabledByName: false,
  disabledBySymbol: false,
  isCustomMainnet: false,
  shouldNetworkSwitchPopToWallet: false,
  trackRpcUpdateFromBanner: false,
  validateChainIdOnSubmit: jest.fn().mockResolvedValue(true),
});

describe('useNetworkOperations — integration', () => {
  describe('saveNetwork', () => {
    it('persists a new custom network and enables it', async () => {
      const flow = buildNetworksFlowHarness();
      const { networkController, networkEnablementController } =
        flow.controllers;

      expect(
        networkController.state.networkConfigurationsByChainId[
          HARNESS_CUSTOM_CHAIN_ID
        ],
      ).toBeUndefined();

      const { result } = flow.renderHookWithFlow(() => useNetworkOperations());

      let saved = false;
      await act(async () => {
        saved = await result.current.saveNetwork(
          customNetworkForm,
          defaultSaveParams(),
        );
      });

      expect(saved).toBe(true);
      expect(
        networkController.state.networkConfigurationsByChainId[
          HARNESS_CUSTOM_CHAIN_ID
        ],
      ).toEqual(
        expect.objectContaining({
          chainId: HARNESS_CUSTOM_CHAIN_ID,
          name: 'Gnosis',
          nativeCurrency: 'XDAI',
        }),
      );
      expect(
        networkEnablementController.state.enabledNetworkMap[
          KnownCaipNamespace.Eip155
        ][HARNESS_CUSTOM_CHAIN_ID],
      ).toBe(true);
      expect(flow.mocks.setTokenNetworkFilter).toHaveBeenCalledWith({
        [HARNESS_CUSTOM_CHAIN_ID]: true,
      });
      expect(flow.mocks.goBack).toHaveBeenCalled();
    });
  });

  describe('removeNetwork', () => {
    it('removes a custom network from NetworkController state', async () => {
      const flow = buildNetworksFlowHarness();
      const { networkController, addCustomNetwork } = flow.controllers;

      addCustomNetwork();
      expect(
        networkController.state.networkConfigurationsByChainId[
          HARNESS_CUSTOM_CHAIN_ID
        ],
      ).toBeDefined();

      const { result } = flow.renderHookWithFlow(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork(HARNESS_CUSTOM_CHAIN_ID);
      });

      expect(
        networkController.state.networkConfigurationsByChainId[
          HARNESS_CUSTOM_CHAIN_ID
        ],
      ).toBeUndefined();
      expect(flow.mocks.goBack).toHaveBeenCalled();
    });

    it('switches active client to mainnet when removing the active custom RPC', async () => {
      const flow = buildNetworksFlowHarness();
      const { networkController, addCustomNetwork } = flow.controllers;

      const added = addCustomNetwork();
      const customClientId =
        added.rpcEndpoints[added.defaultRpcEndpointIndex].networkClientId;

      await networkController.setActiveNetwork(customClientId);
      expect(networkController.state.selectedNetworkClientId).toBe(
        customClientId,
      );

      const mainnetConfig =
        networkController.state.networkConfigurationsByChainId['0x1'];
      const mainnetClientId =
        mainnetConfig.rpcEndpoints[mainnetConfig.defaultRpcEndpointIndex]
          .networkClientId;

      const { result } = flow.renderHookWithFlow(() => useNetworkOperations());

      await act(async () => {
        await result.current.removeNetwork(HARNESS_CUSTOM_CHAIN_ID);
      });

      expect(
        networkController.state.networkConfigurationsByChainId[
          HARNESS_CUSTOM_CHAIN_ID
        ],
      ).toBeUndefined();
      expect(networkController.state.selectedNetworkClientId).toBe(
        mainnetClientId,
      );
      expect(flow.mocks.goBack).toHaveBeenCalled();
    });
  });
});
