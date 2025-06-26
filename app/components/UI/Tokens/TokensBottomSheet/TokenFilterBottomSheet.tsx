// third party dependencies
import { View } from 'react-native';
import React, { useRef, useMemo, useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';

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
import { IconName } from '../../../../component-library/components/Icons/Icon';
import AccountAction from '../../../Views/AccountAction';
import ReusableModal, { ReusableModalRef } from '../../ReusableModal';
import NetworkMultiSelector from '../../NetworkMultiSelector/NetworkMultiSelector';
import CustomNetworkSelector from '../../CustomNetworkSelector/CustomNetworkSelector';
import Device from '../../../../util/device';
import Routes from '../../../../constants/navigation/Routes';

// internal dependencies
import createStyles from './index.styles';
import { NetworkMenuModal } from './TokenFilterBottomSheet.types';

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
