import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import {
  isMultichainV1Enabled,
  getDecimalChainId,
} from '../../../util/networks';
import { NetworkConfiguration } from '@metamask/network-controller';
import {
  InfuraNetworkType,
  BUILT_IN_NETWORKS,
} from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import Logger from '../../../util/Logger';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
} from '../../../selectors/networkController';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';

interface UseSwitchNetworksProps {
  domainIsConnectedDapp?: boolean;
  origin?: string;
  selectedChainId?: Hex;
  selectedNetworkName?: string;
  dismissModal?: () => void;
  closeRpcModal?: () => void;
  parentSpan?: unknown;
}

interface UseSwitchNetworksReturn {
  onSetRpcTarget: (networkConfiguration: NetworkConfiguration) => Promise<void>;
  onNetworkChange: (type: InfuraNetworkType) => Promise<void>;
}

/**
 * Custom hook for handling network switching functionality
 * Most code from app/components/Views/NetworkSelector/NetworkSelector.tsx
 *
 * @param props - Configuration object containing necessary dependencies and callbacks
 * @returns Object containing network switching functions
 */
export function useSwitchNetworks({
  domainIsConnectedDapp = false,
  origin = '',
  selectedChainId,
  selectedNetworkName,
  dismissModal,
  closeRpcModal,
  parentSpan,
}: UseSwitchNetworksProps): UseSwitchNetworksReturn {
  const isAllNetwork = useSelector(selectIsAllNetworks);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const { trackEvent, createEventBuilder } = useMetrics();

  /**
   * Sets the token network filter based on the chain ID
   */
  const setTokenNetworkFilter = useCallback(
    (chainId: string) => {
      const isPopularNetwork =
        chainId === CHAIN_IDS.MAINNET ||
        chainId === CHAIN_IDS.LINEA_MAINNET ||
        PopularList.some((network) => network.chainId === chainId);
      const { PreferencesController } = Engine.context;
      if (!isAllNetwork && isPopularNetwork) {
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
      }
    },
    [isAllNetwork],
  );

  /**
   * Switches to a custom network configuration
   */
  const switchToCustomNetwork = useCallback(
    async (networkConfiguration: NetworkConfiguration) => {
      if (!networkConfiguration) return;

      const { MultichainNetworkController, SelectedNetworkController } =
        Engine.context;
      const {
        name: nickname,
        chainId,
        rpcEndpoints,
        defaultRpcEndpointIndex,
      } = networkConfiguration;

      const networkConfigurationId =
        rpcEndpoints[defaultRpcEndpointIndex].networkClientId;

      if (domainIsConnectedDapp && isMultichainV1Enabled()) {
        SelectedNetworkController.setNetworkClientIdForDomain(
          origin,
          networkConfigurationId,
        );
      } else {
        trace({
          name: TraceName.SwitchCustomNetwork,
          parentContext: parentSpan,
          op: TraceOperation.SwitchCustomNetwork,
        });
        const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];
        try {
          await MultichainNetworkController.setActiveNetwork(networkClientId);
        } catch (error) {
          Logger.error(new Error(`Error in setActiveNetwork: ${error}`));
        }
      }

      setTokenNetworkFilter(chainId);
      if (!(domainIsConnectedDapp && isMultichainV1Enabled())) dismissModal?.();
      endTrace({ name: TraceName.SwitchCustomNetwork });
      endTrace({ name: TraceName.NetworkSwitch });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
          .addProperties({
            chain_id: getDecimalChainId(chainId),
            from_network: selectedNetworkName,
            to_network: nickname,
          })
          .build(),
      );
    },
    [
      domainIsConnectedDapp,
      origin,
      setTokenNetworkFilter,
      selectedNetworkName,
      trackEvent,
      createEventBuilder,
      parentSpan,
      dismissModal,
    ],
  );

  /**
   * Switches to a built-in network
   * The only possible value types are mainnet, linea-mainnet, sepolia and linea-sepolia
   */
  const switchToBuiltInNetwork = useCallback(
    async (type: InfuraNetworkType) => {
      trace({
        name: TraceName.SwitchBuiltInNetwork,
        parentContext: parentSpan,
        op: TraceOperation.SwitchBuiltInNetwork,
      });

      const {
        MultichainNetworkController,
        AccountTrackerController,
        SelectedNetworkController,
      } = Engine.context;

      if (domainIsConnectedDapp && isMultichainV1Enabled()) {
        SelectedNetworkController.setNetworkClientIdForDomain(origin, type);
      } else {
        const networkConfiguration =
          networkConfigurations[BUILT_IN_NETWORKS[type].chainId];

        const clientId =
          networkConfiguration?.rpcEndpoints[
            networkConfiguration.defaultRpcEndpointIndex
          ].networkClientId ?? type;

        setTokenNetworkFilter(networkConfiguration.chainId);
        await MultichainNetworkController.setActiveNetwork(clientId);

        closeRpcModal?.();
        AccountTrackerController.refresh();

        // Update incoming transactions after a delay
        setTimeout(async () => {
          await updateIncomingTransactions([networkConfiguration.chainId]);
        }, 1000);
      }

      dismissModal?.();
      endTrace({ name: TraceName.SwitchBuiltInNetwork });
      endTrace({ name: TraceName.NetworkSwitch });

      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
          .addProperties({
            chain_id: getDecimalChainId(selectedChainId),
            from_network: selectedNetworkName,
            to_network: type,
          })
          .build(),
      );
    },
    [
      domainIsConnectedDapp,
      origin,
      networkConfigurations,
      setTokenNetworkFilter,
      selectedChainId,
      selectedNetworkName,
      trackEvent,
      createEventBuilder,
      parentSpan,
      dismissModal,
      closeRpcModal,
    ],
  );

  return {
    onSetRpcTarget: switchToCustomNetwork,
    onNetworkChange: switchToBuiltInNetwork,
  };
}
