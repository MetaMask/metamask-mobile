// third party dependencies
import React, { useMemo, useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';

// external dependencies
import NetworkMultiSelectorList from '../NetworkMultiSelectorList/NetworkMultiSelectorList';
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
  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const onSelectNetwork = useCallback(
    (currentChainId: CaipChainId) => {
      if (selectedChainIds.includes(currentChainId)) {
        setSelectedChainIds(
          selectedChainIds.filter((_chainId) => _chainId !== currentChainId),
        );
      } else {
        setSelectedChainIds([...selectedChainIds, currentChainId]);
      }
    },
    [selectedChainIds, setSelectedChainIds],
  );

  const showNetworkModal = (networkConfiguration: ExtendedNetwork) => {
    setShowPopularNetworkModal(true);
    setPopularNetwork({
      ...networkConfiguration,
      formattedRpcUrl: networkConfiguration.warning
        ? null
        : hideKeyFromUrl(networkConfiguration.rpcUrl),
    });
  };

  const onCancel = useCallback(() => {
    setShowPopularNetworkModal(false);
    setPopularNetwork(undefined);
  }, []);

  const toggleWarningModal = () => {
    setShowWarningModal(!showWarningModal);
  };

  const networks = useMemo(
    () =>
      Object.entries(networkConfigurations).map(
        ([key, network]: [
          string,
          EvmAndMultichainNetworkConfigurationsWithCaipChainId,
        ]) => {
          const rpcUrl =
            'rpcEndpoints' in network
              ? network.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.url
              : undefined;
          return {
            id: key,
            name: network.name,
            isSelected: false,
            imageSource: getNetworkImageSource({
              chainId: network.caipChainId,
            }),
            caipChainId: network.caipChainId,
            networkTypeOrRpcUrl: rpcUrl,
          };
        },
      ),
    [networkConfigurations],
  );

  const areAllNetworksSelected = networks.every(({ caipChainId }) =>
    selectedChainIds.includes(caipChainId),
  );
  const areAnyNetworksSelected = Boolean(selectedChainIds.length > 0);

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areSomeNetworksSelectedButNotAll =
      areAnyNetworksSelected && !areAllNetworksSelected;

    const selectAll = () => {
      const allSelectedChainIds = networks.map(
        ({ caipChainId }) => caipChainId,
      );
      setSelectedChainIds(allSelectedChainIds);
    };

    const unselectAll = () => {
      setSelectedChainIds([]);
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
          {areSomeNetworksSelectedButNotAll || areAllNetworksSelected
            ? strings('networks.deselect_all')
            : strings('networks.select_all')}
        </Text>
      </View>
    );
  }, [
    areAllNetworksSelected,
    areAnyNetworksSelected,
    networks,
    setSelectedChainIds,
    styles.selectAllText,
  ]);

  return (
    <View style={styles.bodyContainer}>
      {renderSelectAllCheckbox()}
      <NetworkMultiSelectorList
        openModal={openModal}
        networks={networks}
        selectedChainIds={selectedChainIds}
        onSelectNetwork={onSelectNetwork}
        additionalNetworksComponent={
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
        }
      />
    </View>
  );
};

export default NetworkMultiSelector;
