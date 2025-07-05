// third party dependencies
import React, { useCallback, useState } from 'react';
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
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement';
import { useNetworksByNamespace } from '../../hooks/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection';

// internal dependencies
import stylesheet from './NetworkMultiSelector.styles';
import { NetworkMultiSelectorProps } from './NetworkMultiSelector.types';

const NetworkMultiSelector = ({ openModal }: NetworkMultiSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, { colors });

  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState<ExtendedNetwork>();
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Use custom hooks for network management
  const { namespace, enabledNetworksByNamespace } = useNetworkEnablement();
  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: 'popular',
  });
  const { selectNetwork, toggleAll } = useNetworkSelection({
    mode: 'multi',
    networks,
    resetNetworkType: 'custom',
  });

  const showNetworkModal = useCallback(
    (networkConfiguration: ExtendedNetwork) => {
      setShowPopularNetworkModal(true);
      setPopularNetwork({
        ...networkConfiguration,
        formattedRpcUrl: networkConfiguration.warning
          ? null
          : hideKeyFromUrl(networkConfiguration.rpcUrl),
      });
    },
    [setShowPopularNetworkModal, setPopularNetwork],
  );

  const onCancel = useCallback(() => {
    setShowPopularNetworkModal(false);
    setPopularNetwork(undefined);
  }, []);

  const toggleWarningModal = useCallback(() => {
    setShowWarningModal(!showWarningModal);
  }, [setShowWarningModal, showWarningModal]);

  const renderSelectAllCheckbox = useCallback(
    (): React.JSX.Element | null => (
      <View>
        <Text
          style={styles.selectAllText}
          onPress={toggleAll}
          variant={TextVariant.BodyMD}
        >
          {areAllNetworksSelected
            ? strings('networks.deselect_all')
            : strings('networks.select_all')}
        </Text>
      </View>
    ),
    [styles.selectAllText, areAllNetworksSelected, toggleAll],
  );

  return (
    <View style={styles.bodyContainer}>
      {renderSelectAllCheckbox()}
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={networks}
        selectedChainIds={
          Object.keys(enabledNetworksByNamespace[namespace]) as CaipChainId[]
        }
        onSelectNetwork={selectNetwork}
        additionalNetworksComponent={
          <>
            {namespace === KnownCaipNamespace.Eip155 && (
              <View style={styles.customNetworkContainer}>
                <CustomNetwork
                  isNetworkModalVisible={showPopularNetworkModal}
                  closeNetworkModal={onCancel}
                  selectedNetwork={popularNetwork}
                  toggleWarningModal={toggleWarningModal}
                  showNetworkModal={showNetworkModal}
                  switchTab={undefined}
                  shouldNetworkSwitchPopToWallet={false}
                  customNetworksList={PopularList}
                  showCompletionMessage={false}
                  showPopularNetworkModal
                  allowNetworkSwitch={false}
                  hideWarningIcons
                  listHeader={strings('networks.additional_networks')}
                  compactMode
                />
              </View>
            )}
          </>
        }
      />
    </View>
  );
};

export default NetworkMultiSelector;
