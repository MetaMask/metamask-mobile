import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import {
  getDecimalChainId,
  isPerDappSelectedNetworkEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { NetworkConfiguration } from '@metamask/network-controller';
import {
  InfuraNetworkType,
  BUILT_IN_NETWORKS,
} from '@metamask/controller-utils';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipChainId,
  ///: END:ONLY_INCLUDE_IF
  Hex,
} from '@metamask/utils';
import Logger from '../../../util/Logger';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';
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
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectHasCreatedSolanaMainnetAccount } from '../../../selectors/accountsController';
import { SolScope } from '@metamask/keyring-api';
import Routes from '../../../constants/navigation/Routes';
import { AccountSelectorScreens } from '../AccountSelector/AccountSelector.types';
import { useNavigation } from '@react-navigation/native';
///: END:ONLY_INCLUDE_IF
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import {
  NetworkType,
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';

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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  onNonEvmNetworkChange: (chainId: CaipChainId) => Promise<void>;
  ///: END:ONLY_INCLUDE_IF
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
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const isSolanaAccountAlreadyCreated = useSelector(
    selectHasCreatedSolanaMainnetAccount,
  );
  const { navigate } = useNavigation();
  ///: END:ONLY_INCLUDE_IF

  /**
   * Sets the token network filter based on the chain ID
   */
  const setTokenNetworkFilter = useCallback(
    (chainId: Hex) => {
      const isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(chainId);
      const { PreferencesController } = Engine.context;
      if (!isAllNetwork && isPopularNetwork) {
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
      }
      if (isRemoveGlobalNetworkSelectorEnabled()) {
        selectNetwork(chainId);
      }
    },
    [isAllNetwork, selectNetwork],
  );

  /**
   * Switches to a custom EVM network configuration
   */
  const onSetRpcTarget = useCallback(
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

      if (domainIsConnectedDapp && isPerDappSelectedNetworkEnabled()) {
        SelectedNetworkController.setNetworkClientIdForDomain(
          origin,
          networkConfigurationId,
        );
        isPerDappSelectedNetworkEnabled() && dismissModal?.();
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
      if (!(domainIsConnectedDapp && isPerDappSelectedNetworkEnabled()))
        dismissModal?.();
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
  const onNetworkChange = useCallback(
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

      if (domainIsConnectedDapp && isPerDappSelectedNetworkEnabled()) {
        SelectedNetworkController.setNetworkClientIdForDomain(origin, type);
        isPerDappSelectedNetworkEnabled() && dismissModal?.();
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
        AccountTrackerController.refresh([clientId]);

        // Update incoming transactions after a delay
        setTimeout(async () => {
          await updateIncomingTransactions();
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

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  /**
   * Switches to a non-EVM network
   */
  const onNonEvmNetworkChange = useCallback(
    async (chainId: CaipChainId) => {
      if (!isSolanaAccountAlreadyCreated && chainId === SolScope.Mainnet) {
        navigate(Routes.SHEET.ACCOUNT_SELECTOR, {
          navigateToAddAccountActions: AccountSelectorScreens.AddAccountActions,
        });

        return;
      }

      await Engine.context.MultichainNetworkController.setActiveNetwork(
        chainId,
      );
      dismissModal?.();
    },
    [dismissModal, isSolanaAccountAlreadyCreated, navigate],
  );
  ///: END:ONLY_INCLUDE_IF

  return {
    onSetRpcTarget,
    onNetworkChange,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  };
}
