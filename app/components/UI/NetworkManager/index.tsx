// third party dependencies
import { View } from 'react-native';
import React, { useRef, useMemo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { CaipChainId, parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

// external dependencies
import Engine from '../../../core/Engine';
import { removeItemFromChainIdList } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import { MetaMetrics } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { strings } from '../../../../locales/i18n';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonsAlignment } from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks/useStyles';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { IconName } from '../../../component-library/components/Icons/Icon';
import AccountAction from '../../Views/AccountAction';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import NetworkMultiSelector from '../NetworkMultiSelector/NetworkMultiSelector';
import CustomNetworkSelector from '../CustomNetworkSelector/CustomNetworkSelector';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import { selectNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';

// internal dependencies
import createStyles from './index.styles';
import {
  NetworkMenuModalState,
  ShowConfirmDeleteModalState,
  ShowMultiRpcSelectModalState,
} from './index.types';

export const createNetworkManagerNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.SHEET.NETWORK_MANAGER,
);

const initialNetworkMenuModal: NetworkMenuModalState = {
  isVisible: false,
  caipChainId: 'eip155:1',
  displayEdit: false,
  networkTypeOrRpcUrl: '',
  isReadOnly: false,
};

const initialShowConfirmDeleteModal: ShowConfirmDeleteModalState = {
  isVisible: false,
  networkName: '',
  caipChainId: 'eip155:1',
};

const initialShowMultiRpcSelectModal: ShowMultiRpcSelectModalState = {
  isVisible: false,
  chainId: CHAIN_IDS.MAINNET,
  networkName: '',
};

const NetworkManager = () => {
  const networkMenuSheetRef = useRef<BottomSheetRef>(null);
  const rpcMenuSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = useRef<ReusableModalRef>(null);
  const deleteModalSheetRef = useRef<BottomSheetRef>(null);

  const navigation = useNavigation();
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { trackEvent, createEventBuilder } = useMetrics();
  const safeAreaInsets = useSafeAreaInsets();

  const [showNetworkMenuModal, setNetworkMenuModal] =
    useState<NetworkMenuModalState>(initialNetworkMenuModal);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] =
    useState<ShowConfirmDeleteModalState>(initialShowConfirmDeleteModal);
  const [showMultiRpcSelectModal, setShowMultiRpcSelectModal] =
    useState<ShowMultiRpcSelectModalState>(initialShowMultiRpcSelectModal);

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

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

  const openModal = useCallback((networkMenuModal: NetworkMenuModalState) => {
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

  const closeRpcModal = useCallback(() => {
    setShowMultiRpcSelectModal({
      isVisible: false,
      chainId: CHAIN_IDS.MAINNET,
      networkName: '',
    });
    rpcMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const removeRpcUrl = (chainId: CaipChainId) => {
    const networkConfiguration = networkConfigurations[chainId];

    if (!networkConfiguration) {
      throw new Error(`Unable to find network with chain id ${chainId}`);
    }

    closeModal();
    closeRpcModal();

    setShowConfirmDeleteModal({
      isVisible: true,
      networkName: networkConfiguration.name ?? '',
      caipChainId: networkConfiguration.caipChainId,
    });
  };

  const confirmRemoveRpc = () => {
    if (showConfirmDeleteModal.caipChainId) {
      const { caipChainId } = showConfirmDeleteModal;
      const { NetworkController } = Engine.context;
      const rawChainId = parseCaipChainId(caipChainId).reference;
      const chainId = toHex(rawChainId);

      NetworkController.removeNetwork(chainId);

      MetaMetrics.getInstance().addTraitsToUser(
        removeItemFromChainIdList(chainId),
      );

      setShowConfirmDeleteModal({
        isVisible: false,
        networkName: '',
      });
    }
  };

  const closeDeleteModal = useCallback(() => {
    setShowConfirmDeleteModal(() => ({
      networkName: '',
      isVisible: false,
      entry: undefined,
    }));
    networkMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: () => closeDeleteModal(),
  };

  const deleteButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('app_settings.delete'),
    size: ButtonSize.Lg,
    onPress: () => confirmRemoveRpc(),
  };

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
            {showNetworkMenuModal.displayEdit ? (
              <AccountAction
                actionTitle={strings('app_settings.delete')}
                iconName={IconName.Trash}
                onPress={() => removeRpcUrl(showNetworkMenuModal.caipChainId)}
                // testID={NetworkListModalSelectorsIDs.DELETE_NETWORK}
              />
            ) : null}
          </View>
        </BottomSheet>
      )}

      {showConfirmDeleteModal.isVisible ? (
        <BottomSheet
          ref={deleteModalSheetRef}
          onClose={closeDeleteModal}
          shouldNavigateBack={false}
        >
          <BottomSheetHeader>
            <Text variant={TextVariant.HeadingMD}>
              {strings('app_settings.delete')}{' '}
              {showConfirmDeleteModal.networkName}{' '}
              {strings('asset_details.network')}
            </Text>
          </BottomSheetHeader>
          <View style={styles.containerDeleteText}>
            <Text style={styles.textCentred}>
              {strings('app_settings.network_delete')}
            </Text>
            <BottomSheetFooter
              buttonsAlignment={ButtonsAlignment.Horizontal}
              buttonPropsArray={[cancelButtonProps, deleteButtonProps]}
            />
          </View>
        </BottomSheet>
      ) : null}
    </ReusableModal>
  );
};

export default NetworkManager;
