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

  const onSelectNetwork = useCallback(
    async (caipChainId: CaipChainId) => {
      const { MultichainNetworkController } = Engine.context;

      // Parse the selected network's chain ID with error handling
      let caipNamespace: string;
      let reference: string;
      try {
        const parsed = parseCaipChainId(caipChainId);
        caipNamespace = parsed.namespace;
        reference = parsed.reference;
      } catch (error) {
        Logger.error(new Error(`Invalid CAIP chain ID: ${caipChainId}`), error);
        // Still enable network in filter, but don't switch
        await selectPopularNetwork(caipChainId, dismissModal);
        return;
      }

      const isEvmNetwork = caipNamespace === KnownCaipNamespace.Eip155;
      const selectedHexChainId = isEvmNetwork ? toHex(reference) : null;

      // Check if we need to switch the active network
      const shouldSwitchNetwork = isEvmNetwork
        ? selectedHexChainId && selectedHexChainId !== currentChainId
        : caipChainId !== currentChainId;

      if (shouldSwitchNetwork) {
        // Get the current network name before switching
        const fromNetworkName = getNetworkName(currentChainId, isEvmSelected);

        let toNetworkName = strings('network_information.unknown_network');
        let chainIdForAnalytics: string | undefined;
        let networkSwitchSucceeded = false;

        if (isEvmNetwork && selectedHexChainId) {
          const selectedNetworkConfig =
            networkConfigurations[selectedHexChainId];

          if (selectedNetworkConfig) {
            const { name, rpcEndpoints, defaultRpcEndpointIndex } =
              selectedNetworkConfig;

            // Validate rpcEndpoints array and index
            if (!rpcEndpoints?.length) {
              Logger.error(
                new Error(
                  `No RPC endpoints found for chain ${selectedHexChainId}`,
                ),
              );
              // Still enable network in filter
              await selectPopularNetwork(caipChainId, dismissModal);
              return;
            }

            const defaultIndex = defaultRpcEndpointIndex ?? 0;
            const defaultEndpoint = rpcEndpoints[defaultIndex];

            if (!defaultEndpoint?.networkClientId) {
              Logger.error(
                new Error(
                  `Invalid RPC endpoint at index ${defaultIndex} for chain ${selectedHexChainId}`,
                ),
              );
              // Still enable network in filter
              await selectPopularNetwork(caipChainId, dismissModal);
              return;
            }

            const { networkClientId } = defaultEndpoint;
            toNetworkName = name;
            chainIdForAnalytics = getDecimalChainId(selectedHexChainId);

            // Switch to the selected EVM network with error handling
            try {
              await MultichainNetworkController.setActiveNetwork(
                networkClientId,
              );
              networkSwitchSucceeded = true;
            } catch (error) {
              Logger.error(
                new Error(`Error switching to EVM network: ${error}`),
                error,
              );
              // Still enable network in filter, but don't track event
              await selectPopularNetwork(caipChainId, dismissModal);
              return;
            }
          }
        } else {
          // Handle non-EVM network
          const selectedNonEvmConfig = nonEvmNetworkConfigurations[caipChainId];

          if (selectedNonEvmConfig) {
            toNetworkName =
              selectedNonEvmConfig.name ||
              strings('network_information.unknown_network');
            chainIdForAnalytics = getDecimalChainId(caipChainId);

            // Switch to the selected non-EVM network with error handling
            try {
              await MultichainNetworkController.setActiveNetwork(caipChainId);
              networkSwitchSucceeded = true;
            } catch (error) {
              Logger.error(
                new Error(`Error switching to non-EVM network: ${error}`),
                error,
              );
              // Still enable network in filter, but don't track event
              await selectPopularNetwork(caipChainId, dismissModal);
              return;
            }
          }
        }

        // Track Network Switched event only after successful switch
        if (
          networkSwitchSucceeded &&
          chainIdForAnalytics &&
          toNetworkName !== strings('network_information.unknown_network')
        ) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
              .addProperties({
                chain_id: chainIdForAnalytics,
                from_network: fromNetworkName,
                to_network: toNetworkName,
                source: 'Network Filter',
              })
              .build(),
          );
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
      nonEvmNetworkConfigurations,
      trackEvent,
      createEventBuilder,
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
