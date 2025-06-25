import { View } from 'react-native';
import React, { useRef, useMemo, useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { CaipChainId } from '@metamask/utils';

import hideKeyFromUrl from '../../../../util/hideKeyFromUrl';
import { ExtendedNetwork } from '../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import {
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../../selectors/networkController';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useTheme } from '../../../../util/theme';
import createStyles from './index.styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { getNetworkImageSource } from '../../../../util/networks';
import NetworkMultiSelectList from '../../NetworkMultiSelectList/NetworkMultiSelectList';
import { PopularList } from '../../../../util/networks/customNetworks';
import CustomNetwork from '../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';

const NetworkSelectorListTab = () => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState<ExtendedNetwork>();
  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isLoading] = useState(false);

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
        ]) => ({
          id: key,
          name: network.name,
          isSelected: false,
          imageSource: getNetworkImageSource({
            chainId: network.caipChainId,
          }),
          caipChainId: network.caipChainId,
        }),
      ),
    [networkConfigurations],
  );

  const areAllNetworksSelected = networks.every(({ caipChainId }) =>
    selectedChainIds.includes(caipChainId),
  );
  const areAnyNetworksSelected = Boolean(selectedChainIds.length > 0);
  const areNoNetworksSelected = !areAnyNetworksSelected;

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areSomeNetworksSelectedButNotAll =
      areAnyNetworksSelected && !areAllNetworksSelected;

    const selectAll = () => {
      if (isLoading) return;
      const allSelectedChainIds = networks.map(
        ({ caipChainId }) => caipChainId,
      );
      setSelectedChainIds(allSelectedChainIds);
    };

    const unselectAll = () => {
      if (isLoading) return;
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
    isLoading,
    setSelectedChainIds,
    styles.selectAllText,
  ]);

  return (
    <View style={styles.bodyContainer}>
      {renderSelectAllCheckbox()}
      <NetworkMultiSelectList
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
            />
          </View>
        }
      />
    </View>
  );
};

const MockCustomTab = () => (
  <View>
    <Text>Custom</Text>
  </View>
);

const TokenFilterBottomSheet = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const sheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useMetrics();

  const onChangeTab = useCallback(
    async (obj: ChangeTabProperties) => {
      if (obj.ref.props.tabLabel === strings('wallet.default')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.ASSET_FILTER_SELECTED).build(),
        );
      } else {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.ASSET_FILTER_CUSTOM_SELECTED,
          ).build(),
        );
      }
    },
    [trackEvent, createEventBuilder],
  );

  const renderTabBar = useCallback(
    (tabBarProps: Record<string, unknown>) => (
      <View style={styles.tabBarContainer}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          inactiveUnderlineStyle={styles.inactiveUnderlineStyle}
          activeTextColor={colors.text.default}
          inactiveTextColor={colors.text.alternative}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          style={styles.tabBar}
          {...tabBarProps}
        />
      </View>
    ),
    [styles, colors],
  );

  const defaultTabProps = useMemo(
    () => ({
      key: 'default-tab',
      tabLabel: strings('wallet.default'),
      navigation,
    }),
    [navigation],
  );

  const customTabProps = useMemo(
    () => ({
      key: 'custom-tab',
      tabLabel: strings('wallet.custom'),
      navigation,
    }),
    [navigation],
  );

  return (
    <BottomSheet shouldNavigateBack ref={sheetRef}>
      <View style={styles.bottomSheetWrapper}>
        <View>
          <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
            {strings('wallet.networks')}
          </Text>
          <ScrollableTabView
            renderTabBar={renderTabBar}
            onChangeTab={onChangeTab}
          >
            <NetworkSelectorListTab {...defaultTabProps} />
            <MockCustomTab {...customTabProps} />
          </ScrollableTabView>
        </View>
      </View>
    </BottomSheet>
  );
};

export { TokenFilterBottomSheet };
