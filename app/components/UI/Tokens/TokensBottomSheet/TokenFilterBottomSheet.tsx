// third party dependencies
import { View, ImageSourcePropType, TouchableOpacity } from 'react-native';
import React, { useRef, useMemo, useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { CaipChainId } from '@metamask/utils';

// external dependencies
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import NetworkMultiSelector from '../../NetworkMultiSelector/NetworkMultiSelector';
import AccountAction from '../../../Views/AccountAction';

// internal dependencies
import createStyles from './index.styles';
import { NetworkMenuModal } from './TokenFilterBottomSheet.types';

// Custom Network Selector
import { selectCustomNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import { useSelector } from 'react-redux';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../util/networks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Routes from '../../../../constants/navigation/Routes';
import ReusableModal, { ReusableModalRef } from '../../ReusableModal';
import Device from '../../../../util/device';

export interface CustomNetworkItem {
  id: string;
  name: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
  networkTypeOrRpcUrl?: string;
}

interface CustomNetworkSelectorProps {
  openModal: (networkMenuModal: NetworkMenuModal) => void;
}

const CustomNetworkSelector = ({ openModal }: CustomNetworkSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { navigate } = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();

  const customNetworkConfigurations = useSelector(
    selectCustomNetworkConfigurationsByCaipChainId,
  );

  const [selectedNetwork, setSelectedNetwork] = useState('');

  const goToNetworkSettings = useCallback(() => {
    navigate(Routes.ADD_NETWORK, {
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  }, [navigate]);

  const customNetworks = useMemo(
    () =>
      customNetworkConfigurations.map((network) => {
        const rpcUrl =
          'rpcEndpoints' in network
            ? network.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.url
            : undefined;
        return {
          id: network.caipChainId,
          name: network.name,
          caipChainId: network.caipChainId,
          isSelected: selectedNetwork === network.caipChainId,
          imageSource: getNetworkImageSource({
            chainId: network.caipChainId,
          }),
          networkTypeOrRpcUrl: rpcUrl,
        };
      }),
    [customNetworkConfigurations, selectedNetwork],
  );

  const renderNetworkItem: ListRenderItem<CustomNetworkItem> = useCallback(
    ({ item }) => {
      const { name, caipChainId, networkTypeOrRpcUrl } = item;
      return (
        <View
          testID={`${name}-${selectedNetwork ? 'selected' : 'not-selected'}`}
        >
          <Cell
            variant={CellVariant.SelectWithMenu}
            isSelected={selectedNetwork === caipChainId}
            title={name}
            onPress={() => setSelectedNetwork(caipChainId)}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: item.imageSource as ImageSourcePropType,
              size: AvatarSize.Sm,
            }}
            buttonIcon={IconName.MoreVertical}
            buttonProps={{
              onButtonClick: () => {
                openModal({
                  isVisible: true,
                  caipChainId,
                  displayEdit: false,
                  networkTypeOrRpcUrl: networkTypeOrRpcUrl || '',
                  isReadOnly: false,
                });
              },
            }}
          ></Cell>
        </View>
      );
    },
    [selectedNetwork, openModal],
  );

  const renderFooter = useCallback(
    () => (
      <TouchableOpacity
        style={styles.addNetworkButtonContainer}
        onPress={goToNetworkSettings}
      >
        <Icon
          name={IconName.Add}
          size={IconSize.Lg}
          color={colors.icon.alternative}
          style={styles.iconContainer}
        />

        <Text
          variant={TextVariant.BodyMD}
          color={colors.text.alternative}
          style={styles.addNetworkButton}
        >
          {strings('app_settings.network_add_custom_network')}
        </Text>
      </TouchableOpacity>
    ),
    [
      goToNetworkSettings,
      colors.icon.alternative,
      colors.text.alternative,
      styles.addNetworkButton,
      styles.addNetworkButtonContainer,
      styles.iconContainer,
    ],
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={customNetworks}
        renderItem={renderNetworkItem}
        keyExtractor={(item) => item.caipChainId}
        estimatedItemSize={60}
        ListFooterComponent={renderFooter}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom:
            safeAreaInsets.bottom + Device.getDeviceHeight() * 0.05,
        }}
      />
    </View>
  );
};

const initialNetworkMenuModal: NetworkMenuModal = {
  isVisible: false,
  caipChainId: 'eip155:1',
  displayEdit: false,
  networkTypeOrRpcUrl: '',
  isReadOnly: false,
};

const TokenFilterBottomSheet = () => {
  const networkMenuSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = useRef<ReusableModalRef>(null);

  const navigation = useNavigation();
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { trackEvent, createEventBuilder } = useMetrics();
  const safeAreaInsets = useSafeAreaInsets();

  const [showNetworkMenuModal, setNetworkMenuModal] =
    useState<NetworkMenuModal>(initialNetworkMenuModal);

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

  const openModal = useCallback((networkMenuModal: NetworkMenuModal) => {
    setNetworkMenuModal({
      ...networkMenuModal,
      isVisible: true,
    });
    networkMenuSheetRef.current?.onOpenBottomSheet();
  }, []);

  const closeModal = useCallback(() => {
    setNetworkMenuModal(initialNetworkMenuModal);
    networkMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <ReusableModal
      ref={sheetRef}
      style={[
        {
          paddingTop: safeAreaInsets.top + Device.getDeviceHeight() * 0.02,
          paddingBottom: safeAreaInsets.bottom,
        },
      ]}
    >
      <View style={styles.sheet}>
        <View style={styles.notch} />
        <Text
          variant={TextVariant.HeadingMD}
          style={styles.networkTabsSelectorTitle}
        >
          {strings('wallet.networks')}
        </Text>

        <View style={styles.networkTabsSelectorWrapper}>
          <ScrollableTabView
            renderTabBar={renderTabBar}
            onChangeTab={onChangeTab}
          >
            <NetworkMultiSelector {...defaultTabProps} openModal={openModal} />
            <CustomNetworkSelector {...customTabProps} openModal={openModal} />
          </ScrollableTabView>
        </View>
      </View>
      {showNetworkMenuModal.isVisible && (
        <BottomSheet
          ref={networkMenuSheetRef}
          onClose={closeModal}
          shouldNavigateBack={false}
        >
          <View style={styles.editNetworkMenu}>
            <AccountAction
              actionTitle={strings('transaction.edit')}
              iconName={IconName.Edit}
              onPress={() => {
                sheetRef.current?.dismissModal(() => {
                  navigation.navigate(Routes.ADD_NETWORK, {
                    shouldNetworkSwitchPopToWallet: false,
                    shouldShowPopularNetworks: false,
                    network: showNetworkMenuModal.networkTypeOrRpcUrl,
                  });
                });
              }}
            />
          </View>
        </BottomSheet>
      )}
    </ReusableModal>
  );
};

export { TokenFilterBottomSheet };
