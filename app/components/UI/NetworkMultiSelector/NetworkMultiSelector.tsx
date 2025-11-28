// third party dependencies
import React, { useCallback, useState, useMemo, memo } from 'react';
import {
  KnownCaipNamespace,
  CaipChainId,
  parseCaipChainId,
  Hex,
} from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';

// external dependencies
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { Box } from '@metamask/design-system-react-native';
import { ExtendedNetwork } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { PopularList } from '../../../util/networks/customNetworks';
import CustomNetwork from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { strings } from '../../../../locales/i18n';
import NetworkMultiSelectorList from '../NetworkMultiSelectorList/NetworkMultiSelectorList';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import {
  selectNonEvmNetworkConfigurationsByChainId,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getDecimalChainId } from '../../../util/networks';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../core/Engine';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import Logger from '../../../util/Logger';

// internal dependencies
import stylesheet from './NetworkMultiSelector.styles';
import { NetworkMultiSelectorProps } from './NetworkMultiSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell/index.ts';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar/index.ts';
import { IconName } from '../../../component-library/components/Icons/Icon/Icon.types';

interface ModalState {
  showPopularNetworkModal: boolean;
  popularNetwork?: ExtendedNetwork;
  showWarningModal: boolean;
}

const initialModalState: ModalState = {
  showPopularNetworkModal: false,
  popularNetwork: undefined,
  showWarningModal: false,
};

const CUSTOM_NETWORK_PROPS = {
  switchTab: undefined,
  shouldNetworkSwitchPopToWallet: false,
  showCompletionMessage: false,
  showPopularNetworkModal: true,
  allowNetworkSwitch: false,
  hideWarningIcons: true,
  listHeader: strings('networks.additional_networks'),
  compactMode: true,
} as const;

const NetworkMultiSelector = ({
  openModal,
  dismissModal,
  openRpcModal,
}: NetworkMultiSelectorProps) => {
  const { styles } = useStyles(stylesheet, {});

  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const { namespace, enabledNetworksByNamespace } = useNetworkEnablement();
  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );
  const { trackEvent, createEventBuilder } = useMetrics();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedNonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);
  const { chainId: currentEvmChainId } = useNetworkInfo();

  // Get the current chain ID - EVM or non-EVM
  const currentChainId = isEvmSelected
    ? currentEvmChainId
    : selectedNonEvmChainId || null;

  const {
    networksToUse,
    areAllNetworksSelectedCombined,
    isMultichainAccountsState2Enabled,
  } = useNetworksToUse({
    networks,
    networkType: NetworkType.Popular,
    areAllNetworksSelected,
  });

  const { selectPopularNetwork, selectAllPopularNetworks } =
    useNetworkSelection({
      networks: networksToUse,
    });

  const selectedChainIds = useMemo(
    () =>
      Object.keys(enabledNetworksByNamespace[namespace] || {}).filter(
        (chainId) =>
          enabledNetworksByNamespace[namespace]?.[chainId as CaipChainId],
      ) as CaipChainId[],
    [enabledNetworksByNamespace, namespace],
  );

  const showNetworkModal = useCallback(
    (networkConfiguration: ExtendedNetwork) => {
      const formattedNetwork: ExtendedNetwork = {
        ...networkConfiguration,
        formattedRpcUrl: networkConfiguration.warning
          ? null
          : hideKeyFromUrl(networkConfiguration.rpcUrl),
      };

      setModalState((prev) => ({
        ...prev,
        showPopularNetworkModal: true,
        popularNetwork: formattedNetwork,
      }));
    },
    [],
  );

  const onCancel = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      showPopularNetworkModal: false,
      popularNetwork: undefined,
    }));
  }, []);

  const toggleWarningModal = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      showWarningModal: !prev.showWarningModal,
    }));
  }, []);

  const customNetworkProps = useMemo(
    () => ({
      ...CUSTOM_NETWORK_PROPS,
      isNetworkModalVisible: modalState.showPopularNetworkModal,
      closeNetworkModal: onCancel,
      selectedNetwork: modalState.popularNetwork,
      toggleWarningModal,
      showNetworkModal,
      customNetworksList: PopularList,
    }),
    [
      modalState.showPopularNetworkModal,
      modalState.popularNetwork,
      onCancel,
      toggleWarningModal,
      showNetworkModal,
    ],
  );

  const additionalNetworksComponent = useMemo(
    () =>
      namespace === KnownCaipNamespace.Eip155 ||
      isMultichainAccountsState2Enabled ? (
        <Box
          style={styles.customNetworkContainer}
          testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER}
        >
          <CustomNetwork {...customNetworkProps} />
        </Box>
      ) : null,
    [
      namespace,
      customNetworkProps,
      isMultichainAccountsState2Enabled,
      styles.customNetworkContainer,
    ],
  );

  const onSelectAllPopularNetworks = useCallback(async () => {
    await selectAllPopularNetworks(dismissModal);
  }, [dismissModal, selectAllPopularNetworks]);

  // Helper function to get network name from configurations
  const getNetworkName = useCallback(
    (chainId: string | null, isEvm: boolean): string => {
      if (!chainId) return strings('network_information.unknown_network');

      if (isEvm) {
        const networkConfig = networkConfigurations[chainId as Hex];
        return (
          networkConfig?.name || strings('network_information.unknown_network')
        );
      }

      const nonEvmConfig = nonEvmNetworkConfigurations[chainId as CaipChainId];
      return (
        nonEvmConfig?.name || strings('network_information.unknown_network')
      );
    },
    [networkConfigurations, nonEvmNetworkConfigurations],
  );

  // Helper function to parse CAIP chain ID
  const parseCaipChainIdSafe = useCallback(
    (
      caipChainId: CaipChainId,
    ): { namespace: string; reference: string } | null => {
      try {
        return parseCaipChainId(caipChainId);
      } catch (error) {
        Logger.error(new Error(`Invalid CAIP chain ID: ${caipChainId}`), error);
        return null;
      }
    },
    [],
  );

  // Helper function to switch EVM network
  const switchEvmNetwork = useCallback(
    async (
      hexChainId: Hex,
      networkClientId: string,
    ): Promise<{
      success: boolean;
      networkName: string;
      chainId: string;
    } | null> => {
      const { MultichainNetworkController } = Engine.context;
      const selectedNetworkConfig = networkConfigurations[hexChainId];

      if (!selectedNetworkConfig) {
        return null;
      }

      const { name, rpcEndpoints, defaultRpcEndpointIndex } =
        selectedNetworkConfig;

      // Validate rpcEndpoints array and index
      if (!rpcEndpoints?.length) {
        Logger.error(
          new Error(`No RPC endpoints found for chain ${hexChainId}`),
        );
        return null;
      }

      const defaultIndex = defaultRpcEndpointIndex ?? 0;
      const defaultEndpoint = rpcEndpoints[defaultIndex];

      if (!defaultEndpoint?.networkClientId) {
        Logger.error(
          new Error(
            `Invalid RPC endpoint at index ${defaultIndex} for chain ${hexChainId}`,
          ),
        );
        return null;
      }

      try {
        await MultichainNetworkController.setActiveNetwork(networkClientId);
        return {
          success: true,
          networkName: name,
          chainId: getDecimalChainId(hexChainId),
        };
      } catch (error) {
        Logger.error(
          new Error(`Error switching to EVM network: ${error}`),
          error,
        );
        return null;
      }
    },
    [networkConfigurations],
  );

  // Helper function to switch non-EVM network
  const switchNonEvmNetwork = useCallback(
    async (
      caipChainId: CaipChainId,
    ): Promise<{
      success: boolean;
      networkName: string;
      chainId: string;
    } | null> => {
      const { MultichainNetworkController } = Engine.context;
      const selectedNonEvmConfig = nonEvmNetworkConfigurations[caipChainId];

      if (!selectedNonEvmConfig) {
        return null;
      }

      const toNetworkName =
        selectedNonEvmConfig.name ||
        strings('network_information.unknown_network');

      try {
        await MultichainNetworkController.setActiveNetwork(caipChainId);
        return {
          success: true,
          networkName: toNetworkName,
          chainId: getDecimalChainId(caipChainId),
        };
      } catch (error) {
        Logger.error(
          new Error(`Error switching to non-EVM network: ${error}`),
          error,
        );
        return null;
      }
    },
    [nonEvmNetworkConfigurations],
  );

  // Helper function to track network switched event
  const trackNetworkSwitchedEvent = useCallback(
    (chainId: string, fromNetworkName: string, toNetworkName: string): void => {
      if (toNetworkName === strings('network_information.unknown_network')) {
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
          .addProperties({
            chain_id: chainId,
            from_network: fromNetworkName,
            to_network: toNetworkName,
            source: 'Network Filter',
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  const onSelectNetwork = useCallback(
    async (caipChainId: CaipChainId) => {
      // Parse the selected network's chain ID with error handling
      const parsed = parseCaipChainIdSafe(caipChainId);
      if (!parsed) {
        // Still enable network in filter, but don't switch
        await selectPopularNetwork(caipChainId, dismissModal);
        return;
      }

      const { namespace: caipNamespace, reference } = parsed;
      const isEvmNetwork = caipNamespace === KnownCaipNamespace.Eip155;
      const selectedHexChainId = isEvmNetwork ? toHex(reference) : null;

      // Check if we need to switch the active network
      const shouldSwitchNetwork = isEvmNetwork
        ? selectedHexChainId && selectedHexChainId !== currentChainId
        : caipChainId !== currentChainId;

      if (shouldSwitchNetwork) {
        const fromNetworkName = getNetworkName(currentChainId, isEvmSelected);
        let switchResult: {
          success: boolean;
          networkName: string;
          chainId: string;
        } | null = null;

        if (isEvmNetwork && selectedHexChainId) {
          const selectedNetworkConfig =
            networkConfigurations[selectedHexChainId];
          if (selectedNetworkConfig) {
            const defaultEndpoint =
              selectedNetworkConfig.rpcEndpoints[
                selectedNetworkConfig.defaultRpcEndpointIndex ?? 0
              ];
            if (defaultEndpoint?.networkClientId) {
              switchResult = await switchEvmNetwork(
                selectedHexChainId,
                defaultEndpoint.networkClientId,
              );
            }
          }
        } else {
          switchResult = await switchNonEvmNetwork(caipChainId);
        }

        // Track event only if switch succeeded
        if (switchResult?.success) {
          trackNetworkSwitchedEvent(
            switchResult.chainId,
            fromNetworkName,
            switchResult.networkName,
          );
        }

        // If switch failed, still enable network in filter but don't track event
        if (!switchResult?.success) {
          await selectPopularNetwork(caipChainId, dismissModal);
          return;
        }
      }

      // Enable the network in the filter
      await selectPopularNetwork(caipChainId, dismissModal);
    },
    [
      selectPopularNetwork,
      dismissModal,
      currentChainId,
      isEvmSelected,
      networkConfigurations,
      parseCaipChainIdSafe,
      switchEvmNetwork,
      switchNonEvmNetwork,
      trackNetworkSwitchedEvent,
      getNetworkName,
    ],
  );

  const selectAllNetworksComponent = useMemo(
    () => (
      <Cell
        testID={
          areAllNetworksSelectedCombined
            ? NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_SELECTED
            : NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_NOT_SELECTED
        }
        isSelected={areAllNetworksSelectedCombined}
        variant={CellVariant.Select}
        title={strings('networks.all_popular_networks')}
        onPress={onSelectAllPopularNetworks}
        avatarProps={{
          variant: AvatarVariant.Icon,
          name: IconName.Global,
          size: AvatarSize.Sm,
        }}
      />
    ),
    [areAllNetworksSelectedCombined, onSelectAllPopularNetworks],
  );

  return (
    <ScrollView
      style={styles.bodyContainer}
      contentContainerStyle={styles.scrollContentContainer}
      testID={NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER}
    >
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={networksToUse}
        selectedChainIds={selectedChainIds}
        onSelectNetwork={onSelectNetwork}
        additionalNetworksComponent={additionalNetworksComponent}
        selectAllNetworksComponent={selectAllNetworksComponent}
        areAllNetworksSelected={areAllNetworksSelectedCombined}
        openRpcModal={openRpcModal}
      />
    </ScrollView>
  );
};

export default memo(NetworkMultiSelector);
