// third party dependencies
import React, { useCallback, useState, useMemo, memo } from 'react';
import {
  KnownCaipNamespace,
  CaipChainId,
  parseCaipChainId,
  Hex,
} from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { useAddPopularNetwork } from '../../hooks/useAddPopularNetwork';
import { useSelector } from 'react-redux';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectEvmChainId,
} from '../../../selectors/networkController';
import {
  selectNonEvmNetworkConfigurationsByChainId,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getDecimalChainId } from '../../../util/networks';
import { toHex } from '@metamask/controller-utils';
import Logger from '../../../util/Logger';

// internal dependencies
import stylesheet from './NetworkMultiSelector.styles';
import { NetworkMultiSelectorProps } from './NetworkMultiSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell/index.ts';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/index.ts';
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
} as const;

const NetworkMultiSelector = ({
  openModal,
  dismissModal,
  openRpcModal,
}: NetworkMultiSelectorProps) => {
  const insets = useSafeAreaInsets();
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
  const currentEvmChainId = useSelector(selectEvmChainId);

  const { networksToUse, areAllNetworksSelectedCombined } = useNetworksToUse({
    networks,
    networkType: NetworkType.Popular,
    areAllNetworksSelected,
  });

  const currentSelectedNetwork = useMemo(() => {
    if (areAllNetworksSelectedCombined) {
      return null;
    }
    return networksToUse.find((network) => network.isSelected) || null;
  }, [networksToUse, areAllNetworksSelectedCombined]);

  const currentChainId = useMemo(() => {
    if (currentSelectedNetwork) {
      try {
        const parsed = parseCaipChainId(currentSelectedNetwork.caipChainId);
        if (parsed.namespace === KnownCaipNamespace.Eip155) {
          return toHex(parsed.reference);
        }
        return currentSelectedNetwork.caipChainId;
      } catch {
        return currentSelectedNetwork.caipChainId;
      }
    }
    // Check selectedNonEvmChainId first to avoid falling back to EVM when on non-EVM
    if (selectedNonEvmChainId) {
      return selectedNonEvmChainId;
    }
    if (isEvmSelected && currentEvmChainId) {
      return currentEvmChainId;
    }
    return null;
  }, [
    currentSelectedNetwork,
    isEvmSelected,
    currentEvmChainId,
    selectedNonEvmChainId,
  ]);

  const { selectPopularNetwork, selectAllPopularNetworks } =
    useNetworkSelection({
      networks: networksToUse,
    });

  const { addPopularNetwork } = useAddPopularNetwork();

  /**
   * Handler for adding a popular network directly without confirmation.
   */
  const handleAddPopularNetwork = useCallback(
    async (networkConfiguration: ExtendedNetwork) => {
      await addPopularNetwork(networkConfiguration);
    },
    [addPopularNetwork],
  );

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
      skipConfirmation: true,
      onNetworkAdd: handleAddPopularNetwork,
    }),
    [
      modalState.showPopularNetworkModal,
      modalState.popularNetwork,
      onCancel,
      toggleWarningModal,
      showNetworkModal,
      handleAddPopularNetwork,
    ],
  );

  const additionalNetworksComponent = useMemo(
    () => (
      <Box
        style={styles.customNetworkContainer}
        testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER}
      >
        <CustomNetwork {...customNetworkProps} />
      </Box>
    ),
    [customNetworkProps, styles.customNetworkContainer],
  );

  const getNetworkName = useCallback(
    (chainId: string | null): string => {
      if (!chainId) return strings('network_information.unknown_network');

      if (currentSelectedNetwork) {
        if (currentSelectedNetwork.caipChainId === chainId) {
          return currentSelectedNetwork.name;
        }

        try {
          const parsed = parseCaipChainId(currentSelectedNetwork.caipChainId);
          if (parsed.namespace === KnownCaipNamespace.Eip155) {
            const networkHexChainId = toHex(parsed.reference);
            if (networkHexChainId === chainId) {
              return currentSelectedNetwork.name;
            }
          }
        } catch {
          // Continue to fallback logic
        }
      }

      const isEvmChainId = chainId.startsWith('0x');
      if (isEvmChainId) {
        const networkConfig = networkConfigurations[chainId as Hex];
        return (
          networkConfig?.name || strings('network_information.unknown_network')
        );
      }

      const nonEvmConfig = nonEvmNetworkConfigurations[chainId as CaipChainId];
      if (nonEvmConfig) {
        return (
          nonEvmConfig.name || strings('network_information.unknown_network')
        );
      }

      try {
        const parsed = parseCaipChainId(chainId as CaipChainId);
        if (parsed.namespace === KnownCaipNamespace.Eip155) {
          const hexChainId = toHex(parsed.reference);
          const networkConfig = networkConfigurations[hexChainId];
          return (
            networkConfig?.name ||
            strings('network_information.unknown_network')
          );
        }
      } catch {
        // Not a valid CAIP chain ID
      }

      return strings('network_information.unknown_network');
    },
    [
      networkConfigurations,
      nonEvmNetworkConfigurations,
      currentSelectedNetwork,
    ],
  );

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
      let parsed: { namespace: string; reference: string };
      try {
        parsed = parseCaipChainId(caipChainId);
      } catch (error) {
        Logger.error(new Error(`Invalid CAIP chain ID: ${caipChainId}`), error);
        await selectPopularNetwork(caipChainId, dismissModal);
        return;
      }

      const { namespace: caipNamespace, reference } = parsed;
      const isEvmNetwork = caipNamespace === KnownCaipNamespace.Eip155;
      const selectedHexChainId = isEvmNetwork ? toHex(reference) : null;

      const isDifferentNetwork = isEvmNetwork
        ? selectedHexChainId && selectedHexChainId !== currentChainId
        : caipChainId !== currentChainId;

      const isSwitchingFromAllNetworks = areAllNetworksSelectedCombined;
      if (isDifferentNetwork || isSwitchingFromAllNetworks) {
        const fromNetworkName = isSwitchingFromAllNetworks
          ? strings('networks.all_popular_networks')
          : getNetworkName(currentChainId);
        let toNetworkName = strings('network_information.unknown_network');
        let chainIdForAnalytics: string | undefined;

        if (isEvmNetwork && selectedHexChainId) {
          const selectedNetworkConfig =
            networkConfigurations[selectedHexChainId];
          if (selectedNetworkConfig) {
            toNetworkName = selectedNetworkConfig.name;
            chainIdForAnalytics = getDecimalChainId(selectedHexChainId);
          }
        } else {
          const selectedNonEvmConfig = nonEvmNetworkConfigurations[caipChainId];
          if (selectedNonEvmConfig) {
            toNetworkName =
              selectedNonEvmConfig.name ||
              strings('network_information.unknown_network');
            chainIdForAnalytics = getDecimalChainId(caipChainId);
          }
        }

        if (
          chainIdForAnalytics &&
          fromNetworkName !== strings('network_information.unknown_network') &&
          toNetworkName !== strings('network_information.unknown_network')
        ) {
          trackNetworkSwitchedEvent(
            chainIdForAnalytics,
            fromNetworkName,
            toNetworkName,
          );
        }
      }

      await selectPopularNetwork(caipChainId, dismissModal);
    },
    [
      selectPopularNetwork,
      dismissModal,
      currentChainId,
      networkConfigurations,
      nonEvmNetworkConfigurations,
      trackNetworkSwitchedEvent,
      getNetworkName,
      areAllNetworksSelectedCombined,
    ],
  );

  const onSelectAllPopularNetworks = useCallback(async () => {
    if (!areAllNetworksSelectedCombined && currentChainId) {
      const fromNetworkName = getNetworkName(currentChainId);
      const chainIdForAnalytics = currentChainId.startsWith('0x')
        ? getDecimalChainId(currentChainId as Hex)
        : getDecimalChainId(currentChainId as CaipChainId);
      const toNetworkName = strings('networks.all_popular_networks');

      if (
        chainIdForAnalytics &&
        fromNetworkName !== strings('network_information.unknown_network')
      ) {
        trackNetworkSwitchedEvent(
          chainIdForAnalytics,
          fromNetworkName,
          toNetworkName,
        );
      }
    }

    await selectAllPopularNetworks(dismissModal);
  }, [
    dismissModal,
    selectAllPopularNetworks,
    areAllNetworksSelectedCombined,
    currentChainId,
    getNetworkName,
    trackNetworkSwitchedEvent,
  ]);

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
        }}
        style={styles.selectAllPopularNetworksCell}
      />
    ),
    [
      areAllNetworksSelectedCombined,
      onSelectAllPopularNetworks,
      styles.selectAllPopularNetworksCell,
    ],
  );

  return (
    <ScrollView
      style={styles.bodyContainer}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
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
