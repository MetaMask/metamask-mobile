// third party dependencies
import React, { useMemo, useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  CaipChainId,
  parseCaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';

// external dependencies
import Engine from '../../../core/Engine';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks/useStyles';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
} from '../../../selectors/networkController';
import { ExtendedNetwork } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { getNetworkImageSource } from '../../../util/networks';
import { PopularList } from '../../../util/networks/customNetworks';
import CustomNetwork from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import NetworkMultiSelectorList from '../NetworkMultiSelectorList/NetworkMultiSelectorList';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectedSelectedMultichainNetworkChainId } from '../../../selectors/multichainNetworkController';

// internal dependencies
import stylesheet from './NetworkMultiSelector.styles';
import { NetworkMultiSelectorProps } from './NetworkMultiSelector.types';

const NetworkMultiSelector = ({ openModal }: NetworkMultiSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, { colors });
  const networkConfigurations = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );

  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState<ExtendedNetwork>();
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Possibly convert to a hook
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );
  const currentCaipChainId = useSelector(
    selectedSelectedMultichainNetworkChainId,
  );
  const { namespace } = parseCaipChainId(currentCaipChainId);

  const onSelectNetwork = useCallback((currentChainId: CaipChainId) => {
    const { NetworkEnablementController } = Engine.context;
    const isEnabled =
      NetworkEnablementController.isNetworkEnabled(currentChainId);
    if (isEnabled) {
      NetworkEnablementController.setDisabledNetwork(currentChainId);
    } else {
      NetworkEnablementController.setEnabledNetwork(currentChainId);
    }
  }, []);

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

  const networks = useMemo(
    () =>
      Object.entries(networkConfigurations)
        .map(
          ([key, network]: [
            string,
            EvmAndMultichainNetworkConfigurationsWithCaipChainId,
          ]) => {
            const rpcUrl =
              'rpcEndpoints' in network
                ? network.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.url
                : undefined;
            const isSelected = Boolean(
              enabledNetworksByNamespace[namespace][network.chainId],
            );
            return {
              id: key,
              name: network.name,
              isSelected,
              imageSource: getNetworkImageSource({
                chainId: network.caipChainId,
              }),
              caipChainId: network.caipChainId,
              networkTypeOrRpcUrl: rpcUrl,
            };
          },
        )
        .filter((network) => {
          const curNamespace = parseCaipChainId(network.caipChainId).namespace;
          return curNamespace === namespace;
        }),
    [networkConfigurations, enabledNetworksByNamespace, namespace],
  );

  const areAllNetworksSelected = useMemo(() => {
    const networksThatAreEnabled = networks.filter(({ caipChainId }) => {
      const { NetworkEnablementController } = Engine.context;
      const isEnabled =
        NetworkEnablementController.isNetworkEnabled(caipChainId);
      return isEnabled;
    });
    const enabledNetworks = Object.entries(
      enabledNetworksByNamespace[namespace],
    );

    return networksThatAreEnabled.length === enabledNetworks.length;
  }, [networks, enabledNetworksByNamespace, namespace]);

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const { NetworkEnablementController } = Engine.context;

    const selectAll = () => {
      const allSelectedChainIds = networks.map(
        ({ caipChainId }) => caipChainId,
      );
      allSelectedChainIds.forEach((caipChainId) => {
        NetworkEnablementController.setEnabledNetwork(caipChainId);
      });
    };

    const unselectAll = () => {
      const allSelectedChainIds = networks.map(
        ({ caipChainId }) => caipChainId,
      );
      allSelectedChainIds.forEach((caipChainId) => {
        NetworkEnablementController.setDisabledNetwork(caipChainId);
      });
    };

    const onPress = () => {
      areAllNetworksSelected ? unselectAll() : selectAll();
    };

    return (
      <View>
        <Text
          style={styles.selectAllText}
          onPress={onPress}
          variant={TextVariant.BodyMD}
        >
          {areAllNetworksSelected
            ? strings('networks.deselect_all')
            : strings('networks.select_all')}
        </Text>
      </View>
    );
  }, [networks, styles.selectAllText, areAllNetworksSelected]);

  return (
    <View style={styles.bodyContainer}>
      {renderSelectAllCheckbox()}
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={networks}
        selectedChainIds={
          Object.keys(enabledNetworksByNamespace[namespace]) as CaipChainId[]
        }
        onSelectNetwork={onSelectNetwork}
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
