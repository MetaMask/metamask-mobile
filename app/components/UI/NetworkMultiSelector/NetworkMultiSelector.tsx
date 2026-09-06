// third party dependencies
import React, { useCallback, useState, useMemo, memo } from 'react';
import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// external dependencies
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { Box } from '@metamask/design-system-react-native';
import { ExtendedNetwork } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import CustomNetwork from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { strings } from '../../../../locales/i18n';
import NetworkMultiSelectorList from '../NetworkMultiSelectorList/NetworkMultiSelectorList';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';
import { useAddPopularNetwork } from '../../hooks/useAddPopularNetwork';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useSelector } from 'react-redux';
import { getAdditionalNetworksList } from '../../../selectors/configRegistry';

// internal dependencies
import stylesheet from './NetworkMultiSelector.styles';
import { NetworkMultiSelectorProps } from './NetworkMultiSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell/index.ts';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/index.ts';
import { IconName } from '../../../component-library/components/Icons/Icon/Icon.types';
import AccountGroupBalancePerChain from '../Assets/components/Balance/AccountGroupBalancePerChain';

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
  onLocalNetworkSelect,
  localSelectedChainIds,
}: NetworkMultiSelectorProps) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { styles } = useStyles(stylesheet, { theme });

  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const additionalNetworksList = useSelector(getAdditionalNetworksList);

  const { networksToUse } = useNetworksToUse({
    networks,
    networkType: NetworkType.Popular,
    areAllNetworksSelected,
  });

  // Checkmarks always reflect the caller's local (Redux-free) selection.
  const displayNetworks = useMemo(
    () =>
      networksToUse.map((network) => ({
        ...network,
        isSelected: Boolean(
          localSelectedChainIds?.includes(network.caipChainId),
        ),
      })),
    [networksToUse, localSelectedChainIds],
  );

  const displayAreAllNetworksSelected = localSelectedChainIds == null;

  const { addPopularNetwork } = useAddPopularNetwork();
  const { enableAllPopularNetworks } = useNetworkEnablement();

  /**
   * Handler for adding a popular network directly without confirmation.
   * Also locally selects the newly added network so the Tokens/NFT/DeFi
   * lists filter to it right away, matching the previous Redux-driven
   * auto-select behavior.
   */
  const handleAddPopularNetwork = useCallback(
    async (networkConfiguration: ExtendedNetwork) => {
      await addPopularNetwork(networkConfiguration);
      // addPopularNetwork exclusively enables just this one network in
      // NetworkEnablementController (disabling every other network as a
      // side effect). That's fine for the active-network switch it also
      // does, but it corrupts the Redux "enabled networks" set that
      // useChainIdsForLocalFilter falls back to when the local filter is
      // null ("all popular networks") - without this, switching back to
      // "all popular networks" would show only the just-added network's
      // assets. Restore the invariant here.
      enableAllPopularNetworks();
      const hexChainId = toHex(networkConfiguration.chainId) as Hex;
      onLocalNetworkSelect([formatChainIdToCaip(hexChainId)]);
      // Selecting an already-added network (onSelectNetwork) dismisses the
      // modal immediately; do the same here. Otherwise the modal keeps
      // showing localSelectedChainIds from the (now-stale) navigation
      // params it was opened with, so the newly added network's row
      // wouldn't appear checked until the modal is reopened.
      dismissModal?.();
    },
    [
      addPopularNetwork,
      enableAllPopularNetworks,
      onLocalNetworkSelect,
      dismissModal,
    ],
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
      customNetworksList: additionalNetworksList,
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
      additionalNetworksList,
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

  const onSelectNetwork = useCallback(
    (caipChainId: CaipChainId) => {
      onLocalNetworkSelect([caipChainId]);
      dismissModal?.();
    },
    [onLocalNetworkSelect, dismissModal],
  );

  const onSelectAllPopularNetworks = useCallback(() => {
    onLocalNetworkSelect(null);
    dismissModal?.();
  }, [onLocalNetworkSelect, dismissModal]);

  const selectAllNetworksComponent = useMemo(
    () => (
      <Cell
        testID={
          displayAreAllNetworksSelected
            ? NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_SELECTED
            : NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_NOT_SELECTED
        }
        isSelected={displayAreAllNetworksSelected}
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
      displayAreAllNetworksSelected,
      onSelectAllPopularNetworks,
      styles.selectAllPopularNetworksCell,
    ],
  );

  const renderBalancePerChain = useCallback(
    (caipChainId: CaipChainId) => (
      <AccountGroupBalancePerChain caipChainId={caipChainId} />
    ),
    [],
  );

  return (
    <ScrollView
      style={styles.bodyContainer}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      testID={NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER}
    >
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={displayNetworks}
        onSelectNetwork={onSelectNetwork}
        renderRightAccessory={renderBalancePerChain}
        additionalNetworksComponent={additionalNetworksComponent}
        selectAllNetworksComponent={selectAllNetworksComponent}
        areAllNetworksSelected={displayAreAllNetworksSelected}
        openRpcModal={openRpcModal}
      />
    </ScrollView>
  );
};

export default memo(NetworkMultiSelector);
