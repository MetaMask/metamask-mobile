// third party dependencies
import React, { useCallback, useState, useMemo, memo } from 'react';
import { KnownCaipNamespace, CaipChainId } from '@metamask/utils';
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
  useNetworksByCustomNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';

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
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/index.ts';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts.ts';
import { EVM_SCOPE } from '../Earn/constants/networks.ts';
import { SolScope } from '@metamask/keyring-api';

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
}: NetworkMultiSelectorProps) => {
  const { styles } = useStyles(stylesheet, {});

  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const { namespace, enabledNetworksByNamespace } = useNetworkEnablement();
  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const {
    networks: evmNetworks,
    areAllNetworksSelected: areAllEvmNetworksSelected,
  } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });

  const {
    networks: solanaNetworks,
    areAllNetworksSelected: areAllSolanaNetworksSelected,
  } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Solana,
  });

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const selectedEvmAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const selectedSolanaAccount = useSelector(
    selectSelectedInternalAccountByScope,
  )(SolScope.Mainnet);

  const networksToUse = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (selectedEvmAccount && selectedSolanaAccount) {
        return [...evmNetworks, ...solanaNetworks];
      } else if (selectedEvmAccount) {
        return evmNetworks;
      } else if (selectedSolanaAccount) {
        return solanaNetworks;
      }
      return networks;
    }
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    selectedEvmAccount,
    selectedSolanaAccount,
    evmNetworks,
    solanaNetworks,
    networks,
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (selectedEvmAccount && selectedSolanaAccount) {
        return areAllEvmNetworksSelected && areAllSolanaNetworksSelected;
      } else if (selectedEvmAccount) {
        return areAllEvmNetworksSelected;
      } else if (selectedSolanaAccount) {
        return areAllSolanaNetworksSelected;
      }
      return areAllNetworksSelected;
    }
    return areAllNetworksSelected;
  }, [
    isMultichainAccountsState2Enabled,
    selectedEvmAccount,
    selectedSolanaAccount,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    areAllNetworksSelected,
  ]);

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

  const onSelectNetwork = useCallback(
    async (caipChainId: CaipChainId) => {
      await selectPopularNetwork(caipChainId, dismissModal);
    },
    [selectPopularNetwork, dismissModal],
  );

  const selectAllNetworksComponent = useMemo(
    () => (
      <Cell
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
      testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CONTAINER}
    >
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={networksToUse}
        selectedChainIds={selectedChainIds}
        onSelectNetwork={onSelectNetwork}
        additionalNetworksComponent={additionalNetworksComponent}
        selectAllNetworksComponent={selectAllNetworksComponent}
        areAllNetworksSelected={areAllNetworksSelectedCombined}
      />
    </ScrollView>
  );
};

export default memo(NetworkMultiSelector);
