// third party dependencies
import React, { useCallback, useState, useMemo, memo } from 'react';
import { View } from 'react-native';
import { KnownCaipNamespace, CaipChainId } from '@metamask/utils';

// external dependencies
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { ExtendedNetwork } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { PopularList } from '../../../util/networks/customNetworks';
import CustomNetwork from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import NetworkMultiSelectorList from '../NetworkMultiSelectorList/NetworkMultiSelectorList';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';

// internal dependencies
import stylesheet from './NetworkMultiSelector.styles';
import { NetworkMultiSelectorProps } from './NetworkMultiSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';

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

const SELECT_ALL_STRINGS = {
  select: strings('networks.select_all'),
  deselect: strings('networks.deselect_all'),
} as const;

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

const NetworkMultiSelector = ({ openModal }: NetworkMultiSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, { colors });

  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const { namespace, enabledNetworksByNamespace } = useNetworkEnablement();
  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectPopularNetwork, toggleAll } = useNetworkSelection({
    networks,
  });

  const selectedChainIds = useMemo(
    () =>
      Object.keys(enabledNetworksByNamespace[namespace] || {}).filter(
        (chainId) =>
          enabledNetworksByNamespace[namespace]?.[chainId as CaipChainId],
      ) as CaipChainId[],
    [enabledNetworksByNamespace, namespace],
  );

  const selectAllText = useMemo(
    () =>
      areAllNetworksSelected
        ? SELECT_ALL_STRINGS.deselect
        : SELECT_ALL_STRINGS.select,
    [areAllNetworksSelected],
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

  const renderSelectAllCheckbox = useCallback(
    (): React.JSX.Element => (
      <View>
        <Text
          style={styles.selectAllText}
          onPress={toggleAll}
          variant={TextVariant.BodyMD}
          testID={NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_TEXT}
        >
          {selectAllText}
        </Text>
      </View>
    ),
    [styles.selectAllText, selectAllText, toggleAll],
  );

  const additionalNetworksComponent = useMemo(
    () =>
      namespace === KnownCaipNamespace.Eip155 ? (
        <View
          style={styles.customNetworkContainer}
          testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORK_CONTAINER}
        >
          <CustomNetwork {...customNetworkProps} />
        </View>
      ) : null,
    [namespace, styles.customNetworkContainer, customNetworkProps],
  );

  return (
    <View
      style={styles.bodyContainer}
      testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CONTAINER}
    >
      {renderSelectAllCheckbox()}
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={networks}
        selectedChainIds={selectedChainIds}
        onSelectNetwork={selectPopularNetwork}
        additionalNetworksComponent={additionalNetworksComponent}
      />
    </View>
  );
};

export default memo(NetworkMultiSelector);
