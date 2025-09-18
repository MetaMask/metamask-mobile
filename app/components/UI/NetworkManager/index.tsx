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
import NetworkMultiSelector from '../NetworkMultiSelector/NetworkMultiSelector';
import CustomNetworkSelector from '../CustomNetworkSelector/CustomNetworkSelector';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import { selectNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';

// internal dependencies
import createStyles from './index.styles';
import {
  NetworkMenuModalState,
  ShowConfirmDeleteModalState,
} from './index.types';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';

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

const NetworkManager = () => {
  const networkMenuSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = useRef<BottomSheetRef>(null);
  const deleteModalSheetRef = useRef<BottomSheetRef>(null);

  const navigation = useNavigation();
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { trackEvent, createEventBuilder } = useMetrics();
  const safeAreaInsets = useSafeAreaInsets();
  const { selectedCount } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { disableNetwork, enabledNetworksByNamespace } = useNetworkEnablement();

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const enabledNetworks = useMemo(() => {
    function getEnabledNetworks(
      obj: Record<string, boolean | Record<string, boolean>>,
    ): string[] {
      const enabled: string[] = [];

      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // recurse into nested object
          enabled.push(...getEnabledNetworks(value));
        } else if (value === true) {
          // Return just the chain ID, not the full namespace path
          enabled.push(key);
        }
      });

      return enabled;
    }

    return getEnabledNetworks(enabledNetworksByNamespace);
  }, [enabledNetworksByNamespace]);

  const [showNetworkMenuModal, setNetworkMenuModal] =
    useState<NetworkMenuModalState>(initialNetworkMenuModal);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] =
    useState<ShowConfirmDeleteModalState>(initialShowConfirmDeleteModal);

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const containerStyle = useMemo(
    () => [
      {
        paddingTop: safeAreaInsets.top + Device.getDeviceHeight() * 0.02,
        paddingBottom: safeAreaInsets.bottom,
      },
    ],
    [safeAreaInsets.top, safeAreaInsets.bottom],
  );

  const defaultTabProps = useMemo(
    () => ({
      key: 'default-tab',
      tabLabel: strings('wallet.popular'),
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

  const buttonConfigs = useMemo(
    () => ({
      cancel: {
        variant: ButtonVariants.Secondary,
        label: strings('accountApproval.cancel'),
        size: ButtonSize.Lg,
      } as const,
      delete: {
        variant: ButtonVariants.Primary,
        label: strings('app_settings.delete'),
        size: ButtonSize.Lg,
      } as const,
    }),
    [],
  );

  const onChangeTab = useCallback(
    (obj: ChangeTabProperties) => {
      const isDefaultTab = obj.ref.props.tabLabel === strings('wallet.default');
      const eventType = isDefaultTab
        ? MetaMetricsEvents.ASSET_FILTER_SELECTED
        : MetaMetricsEvents.ASSET_FILTER_CUSTOM_SELECTED;

      trackEvent(createEventBuilder(eventType).build());
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

  const openModal = useCallback((networkMenuModal: NetworkMenuModalState) => {
    setNetworkMenuModal((prev) => ({
      ...prev,
      ...networkMenuModal,
      isVisible: true,
    }));
    networkMenuSheetRef.current?.onOpenBottomSheet();
  }, []);

  const closeModal = useCallback(() => {
    setNetworkMenuModal(initialNetworkMenuModal);
    networkMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowConfirmDeleteModal(initialShowConfirmDeleteModal);
    networkMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleEditNetwork = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
        network: showNetworkMenuModal.networkTypeOrRpcUrl,
      });
    });
  }, [navigation, showNetworkMenuModal.networkTypeOrRpcUrl]);

  const removeRpcUrl = useCallback(
    (chainId: CaipChainId) => {
      const networkConfiguration = networkConfigurations[chainId];

      if (!networkConfiguration) {
        throw new Error(`Unable to find network with chain id ${chainId}`);
      }

      closeModal();

      setShowConfirmDeleteModal({
        isVisible: true,
        networkName: networkConfiguration.name ?? '',
        caipChainId: networkConfiguration.caipChainId,
      });
    },
    [networkConfigurations, closeModal],
  );

  const confirmRemoveRpc = useCallback(() => {
    if (showConfirmDeleteModal.caipChainId) {
      const { caipChainId } = showConfirmDeleteModal;
      const { NetworkController } = Engine.context;
      const rawChainId = parseCaipChainId(caipChainId).reference;
      const chainId = toHex(rawChainId);

      NetworkController.removeNetwork(chainId);
      disableNetwork(showConfirmDeleteModal.caipChainId);

      MetaMetrics.getInstance().addTraitsToUser(
        removeItemFromChainIdList(chainId),
      );

      setShowConfirmDeleteModal(initialShowConfirmDeleteModal);
    }
  }, [showConfirmDeleteModal, disableNetwork]);

  const cancelButtonProps: ButtonProps = useMemo(
    () => ({
      ...buttonConfigs.cancel,
      onPress: closeDeleteModal,
    }),
    [buttonConfigs.cancel, closeDeleteModal],
  );

  const deleteButtonProps: ButtonProps = useMemo(
    () => ({
      ...buttonConfigs.delete,
      onPress: confirmRemoveRpc,
    }),
    [buttonConfigs.delete, confirmRemoveRpc],
  );

  const defaultTabIndex = useMemo(() => {
    // If no popular networks are selected, default to custom tab (index 1)
    // Otherwise, show popular tab (index 0)
    if (isMultichainAccountsState2Enabled) {
      if (enabledNetworks.length === 1) {
        const isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(
          enabledNetworks[0] as `0x${string}`,
        )
          ? 0
          : 1;
        return isPopularNetwork;
      }

      return enabledNetworks.length > 1 ? 0 : 1;
    }
    return selectedCount > 0 ? 0 : 1;
  }, [selectedCount, isMultichainAccountsState2Enabled, enabledNetworks]);

  const dismissModal = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={sheetRef} style={containerStyle} shouldNavigateBack>
      <View style={styles.sheet}>
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
            initialPage={defaultTabIndex}
          >
            <NetworkMultiSelector
              {...defaultTabProps}
              openModal={openModal}
              dismissModal={dismissModal}
            />
            <CustomNetworkSelector
              {...customTabProps}
              openModal={openModal}
              dismissModal={dismissModal}
            />
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
              onPress={handleEditNetwork}
            />
            {showNetworkMenuModal.displayEdit && (
              <AccountAction
                actionTitle={strings('app_settings.delete')}
                iconName={IconName.Trash}
                onPress={() => removeRpcUrl(showNetworkMenuModal.caipChainId)}
              />
            )}
          </View>
        </BottomSheet>
      )}

      {showConfirmDeleteModal.isVisible && (
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
      )}
    </BottomSheet>
  );
};

export default NetworkManager;
