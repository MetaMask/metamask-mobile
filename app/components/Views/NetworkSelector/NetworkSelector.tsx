// Third party dependencies.
import { KeyboardAvoidingView, Linking, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, type RouteProp } from '@react-navigation/native';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../core/NavigationService/types';

// External dependencies.
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useSelector } from 'react-redux';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
} from '../../../selectors/networkController';
import {
  selectShowTestNetworks,
  selectTokenNetworkFilter,
} from '../../../selectors/preferencesController';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import {
  ButtonSize as InternalButtonSize,
  ButtonProps,
} from '../../../component-library/components/Buttons/Button/Button.types';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { NetworkListModalSelectorsIDs } from './NetworkListModal.testIds';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';

// Internal dependencies
import createStyles from './NetworkSelector.styles';
import { ShowConfirmDeleteModalState } from './types';
import { getTokenNetworkFilterAfterNetworkDelete } from './utils/getTokenNetworkFilterAfterNetworkDelete';
import InfoModal from '../../Base/InfoModal';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { NetworksSelectorSelectorsIDs } from '../Settings/NetworksSettings/NetworksView.testIds';
import NetworkSearchTextInput from './NetworkSearchTextInput';
import { useAddPopularNetwork } from '../../hooks/useAddPopularNetwork';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AccountAction from '../AccountAction';
import { ButtonsAlignment } from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ExtendedNetwork } from '../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
import { CaipChainId, Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import type { NetworkConfiguration } from '@metamask/network-controller';
import type { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import RpcSelectionModal from './RpcSelectionModal/RpcSelectionModal';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  selectIsEvmNetworkSelected,
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { useSwitchNetworks } from './useSwitchNetworks';
import { removeItemFromChainIdList } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import { analytics } from '../../../util/analytics/analytics';
import { NETWORK_SELECTOR_SOURCES } from '../../../constants/networkSelector';
import { getGasFeesSponsoredNetworkEnabled } from '../../../selectors/featureFlagController/gasFeesSponsored';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { isHardwareAccount } from '../../../util/address';
import NetworkSelectorList from './NetworkSelectorList';

interface NetworkSelectorProps {
  route: RouteProp<RootStackParamList, 'NetworkSelector'>;
}

const NetworkSelector = ({ route }: NetworkSelectorProps) => {
  trace({
    name: TraceName.NetworkSwitch,
    op: TraceOperation.NetworkSwitch,
  });
  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState<ExtendedNetwork>();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [searchString, setSearchString] = useState('');
  const { navigate } = useNavigation<AppNavigationProp>();

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const sheetRef = useRef<ReusableModalRef>(null);
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const isAllNetwork = useSelector(selectIsAllNetworks);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const safeAreaInsets = useSafeAreaInsets();
  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareWallet = Boolean(
    selectedAddress && isHardwareAccount(selectedAddress),
  );

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedNonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);

  // origin is defined if network selector is opened from a dapp
  const origin = route?.params?.hostInfo?.metadata?.origin || '';
  const browserChainId = route?.params?.chainId || null;
  const parentSpan = trace({
    name: TraceName.NetworkSwitch,
    tags: getTraceTags(store.getState()),
    op: TraceOperation.NetworkSwitch,
  });
  const {
    chainId: selectedChainId,
    rpcUrl: selectedRpcUrl,
    domainIsConnectedDapp,
    networkName: selectedNetworkName,
  } = useNetworkInfo(origin);

  const { addPopularNetwork } = useAddPopularNetwork();

  const isSendFlow =
    route?.params?.source === NETWORK_SELECTOR_SOURCES.SEND_FLOW;

  const isRedesignEnabled = isNetworkUiRedesignEnabled();
  const avatarSize = isRedesignEnabled ? AvatarSize.Sm : undefined;
  const modalTitle = isRedesignEnabled
    ? 'networks.additional_network_information_title'
    : 'networks.network_warning_title';
  const modalDescription = isRedesignEnabled
    ? 'networks.additonial_network_information_desc'
    : 'networks.network_warning_desc';
  const buttonLabelAddNetwork = isRedesignEnabled
    ? 'app_settings.network_add_custom_network'
    : 'app_settings.network_add_network';
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] =
    useState<ShowConfirmDeleteModalState>({
      isVisible: false,
      networkName: '',
    });

  const [showNetworkMenuModal, setNetworkMenuModal] = useState<{
    isVisible: boolean;
    chainId: `0x${string}`;
    displayEdit: boolean;
    networkTypeOrRpcUrl: string;
    isReadOnly: boolean;
  }>({
    isVisible: false,
    chainId: '0x1',
    displayEdit: false,
    networkTypeOrRpcUrl: '',
    isReadOnly: false,
  });

  const [showMultiRpcSelectModal, setShowMultiRpcSelectModal] = useState<{
    isVisible: boolean;
    chainId: string;
    networkName: string;
  }>({
    isVisible: false,
    chainId: CHAIN_IDS.MAINNET,
    networkName: '',
  });

  const networkMenuSheetRef = useRef<BottomSheetRef>(null);

  const rpcMenuSheetRef = useRef<BottomSheetRef>(null);

  const deleteModalSheetRef = useRef<BottomSheetRef>(null);

  /**
   * This is used to check if the network has multiple RPC endpoints
   * We need to check if the network is non-EVM because we don't support multiple RPC endpoints for non-EVM networks and the rpc is handled by the snap
   */
  const showRpcSelector = Object.values(networkConfigurations)
    .filter(
      (network: NetworkConfiguration | MultichainNetworkConfiguration) =>
        !isNonEvmChainId(network.chainId),
    )
    .some(
      (networkConfiguration) =>
        networkConfiguration.rpcEndpoints &&
        networkConfiguration.rpcEndpoints.length > 1,
    );

  const openRpcModal = useCallback(
    ({ chainId, networkName }: { chainId: Hex; networkName: string }) => {
      setShowMultiRpcSelectModal({
        isVisible: true,
        chainId,
        networkName,
      });
      rpcMenuSheetRef.current?.onOpenBottomSheet();
    },
    [],
  );

  const closeRpcModal = useCallback(() => {
    setShowMultiRpcSelectModal({
      isVisible: false,
      chainId: CHAIN_IDS.MAINNET,
      networkName: '',
    });
    rpcMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const openModal = useCallback(
    (
      chainId: Hex,
      displayEdit: boolean,
      networkTypeOrRpcUrl: string,
      isReadOnly: boolean,
    ) => {
      setNetworkMenuModal({
        isVisible: true,
        chainId,
        displayEdit,
        networkTypeOrRpcUrl,
        isReadOnly,
      });
      networkMenuSheetRef.current?.onOpenBottomSheet();
    },
    [],
  );

  const closeModal = useCallback(() => {
    setNetworkMenuModal(() => ({
      chainId: '0x1',
      isVisible: false,
      displayEdit: false,
      networkTypeOrRpcUrl: '',
      isReadOnly: false,
    }));
    networkMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowConfirmDeleteModal(() => ({
      networkName: '',
      isVisible: false,
      entry: undefined,
    }));
    networkMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const showNetworkModal = (networkConfiguration: ExtendedNetwork) => {
    setShowPopularNetworkModal(true);
    setPopularNetwork({
      ...networkConfiguration,
      formattedRpcUrl: networkConfiguration.warning
        ? null
        : hideKeyFromUrl(networkConfiguration.rpcUrl),
    });
  };

  /**
   * Handler for adding a popular network directly without confirmation.
   */
  const handleAddPopularNetwork = useCallback(
    async (networkConfiguration: ExtendedNetwork) => {
      await addPopularNetwork(networkConfiguration);
    },
    [addPopularNetwork],
  );

  const onCancel = () => {
    setShowPopularNetworkModal(false);
    setPopularNetwork(undefined);
  };

  const toggleWarningModal = () => {
    setShowWarningModal(!showWarningModal);
  };

  const goToLearnMore = () => {
    Linking.openURL(strings('networks.learn_more_url'));
  };

  const isNetworkSelected = (chainId: Hex | CaipChainId) => {
    if (browserChainId) {
      return chainId === browserChainId;
    }

    if (!isEvmSelected) {
      return chainId === selectedNonEvmChainId;
    }

    return chainId === selectedChainId;
  };

  const { onSetRpcTarget, onNetworkChange, onNonEvmNetworkChange } =
    useSwitchNetworks({
      domainIsConnectedDapp,
      origin,
      selectedChainId,
      selectedNetworkName,
      dismissModal: () => sheetRef.current?.dismissModal(),
      closeRpcModal,
      parentSpan,
    });

  useEffect(() => {
    endTrace({ name: TraceName.NetworkSwitch });
  }, []);

  const goToNetworkSettings = () => {
    sheetRef.current?.dismissModal(() => {
      navigate(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
      });
    });
  };

  const handleSearchTextChange = (text: string) => {
    setSearchString(text);
  };

  const clearSearchInput = () => {
    setSearchString('');
  };

  const removeRpcUrl = (chainId: `0x${string}`) => {
    const networkConfiguration = networkConfigurations[chainId];

    if (!networkConfiguration) {
      throw new Error(`Unable to find network with chain id ${chainId}`);
    }

    closeModal();
    closeRpcModal();

    setShowConfirmDeleteModal({
      isVisible: true,
      networkName: networkConfiguration.name ?? '',
      chainId: networkConfiguration.chainId,
    });
  };

  const confirmRemoveRpc = () => {
    if (showConfirmDeleteModal.chainId) {
      const { chainId } = showConfirmDeleteModal;
      const { NetworkController } = Engine.context;
      NetworkController.removeNetwork(chainId);

      analytics.identify(removeItemFromChainIdList(chainId));

      // set tokenNetworkFilter
      const { PreferencesController } = Engine.context;
      PreferencesController.setTokenNetworkFilter(
        getTokenNetworkFilterAfterNetworkDelete(
          isAllNetwork,
          tokenNetworkFilter,
          chainId,
        ) as Record<string, boolean>,
      );

      setShowConfirmDeleteModal({
        isVisible: false,
        networkName: '',
      });
    }
  };

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: InternalButtonSize.Lg,
    onPress: () => closeDeleteModal(),
  };

  const deleteButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('app_settings.delete'),
    size: InternalButtonSize.Lg,
    onPress: () => confirmRemoveRpc(),
  };

  return (
    <ReusableModal ref={sheetRef} style={styles.screen}>
      <View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.notch} />
        <Text variant={TextVariant.HeadingMD} style={styles.title}>
          {strings('networks.select_network')}
        </Text>
        <View style={styles.searchContainer}>
          <NetworkSearchTextInput
            searchString={searchString}
            handleSearchTextChange={handleSearchTextChange}
            clearSearchInput={clearSearchInput}
            testIdSearchInput={
              NetworksSelectorSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID
            }
            testIdCloseIcon={NetworksSelectorSelectorsIDs.CLOSE_ICON}
          />
        </View>
        <KeyboardAvoidingView
          behavior="height"
          style={styles.keyboardView}
          enabled
        >
          <NetworkSelectorList
            networkConfigurations={networkConfigurations}
            nonEvmNetworkConfigurations={nonEvmNetworkConfigurations}
            searchString={searchString}
            showTestNetworks={showTestNetworks}
            isSendFlow={isSendFlow}
            isRedesignEnabled={isRedesignEnabled}
            showRpcSelector={showRpcSelector}
            selectedChainId={selectedChainId}
            selectedRpcUrl={selectedRpcUrl}
            isEvmSelected={isEvmSelected}
            isHardwareWallet={isHardwareWallet}
            avatarSize={avatarSize}
            showPopularNetworkModal={showPopularNetworkModal}
            popularNetwork={popularNetwork}
            isGasFeesSponsoredNetworkEnabled={isGasFeesSponsoredNetworkEnabled}
            isNetworkSelected={isNetworkSelected}
            onSetRpcTarget={onSetRpcTarget}
            onNetworkChange={onNetworkChange}
            onNonEvmNetworkChange={onNonEvmNetworkChange}
            openModal={openModal}
            openRpcModal={openRpcModal}
            onCancel={onCancel}
            toggleWarningModal={toggleWarningModal}
            showNetworkModal={showNetworkModal}
            handleAddPopularNetwork={handleAddPopularNetwork}
          />
          {!isSendFlow ? (
            <Button
              variant={ButtonVariant.Secondary}
              onPress={goToNetworkSettings}
              isFullWidth
              size={ButtonSize.Lg}
              style={styles.addNetworkButton}
              testID={NetworkListModalSelectorsIDs.ADD_BUTTON}
            >
              {strings(buttonLabelAddNetwork)}
            </Button>
          ) : null}
        </KeyboardAvoidingView>

        {showWarningModal ? (
          <InfoModal
            isVisible={showWarningModal}
            title={strings(modalTitle)}
            body={
              <Text>
                <Text style={styles.desc}>{strings(modalDescription)}</Text>{' '}
                <Text style={[styles.blueText]} onPress={goToLearnMore}>
                  {strings('networks.learn_more')}
                </Text>
              </Text>
            }
            toggleModal={toggleWarningModal}
          />
        ) : null}

        {showNetworkMenuModal.isVisible ? (
          <BottomSheet
            ref={networkMenuSheetRef}
            onClose={closeModal}
            shouldNavigateBack={false}
          >
            <View style={styles.networkMenu}>
              <AccountAction
                actionTitle={strings('transaction.edit')}
                iconName={IconName.Edit}
                onPress={() => {
                  sheetRef.current?.dismissModal(() => {
                    navigate(Routes.ADD_NETWORK, {
                      shouldNetworkSwitchPopToWallet: false,
                      shouldShowPopularNetworks: false,
                      network: showNetworkMenuModal.networkTypeOrRpcUrl,
                    });
                  });
                }}
              />
              {showNetworkMenuModal.chainId !== selectedChainId &&
              showNetworkMenuModal.displayEdit ? (
                <AccountAction
                  actionTitle={strings('app_settings.delete')}
                  iconName={IconName.Trash}
                  onPress={() => removeRpcUrl(showNetworkMenuModal.chainId)}
                  testID={NetworkListModalSelectorsIDs.DELETE_NETWORK}
                />
              ) : null}
            </View>
          </BottomSheet>
        ) : null}

        <RpcSelectionModal
          showMultiRpcSelectModal={showMultiRpcSelectModal}
          closeRpcModal={closeRpcModal}
          rpcMenuSheetRef={rpcMenuSheetRef}
          networkConfigurations={networkConfigurations}
          styles={styles}
        />

        {showConfirmDeleteModal.isVisible ? (
          <BottomSheet
            ref={deleteModalSheetRef}
            onClose={closeDeleteModal}
            shouldNavigateBack={false}
          >
            <BottomSheetHeader>
              {strings('app_settings.delete')}{' '}
              {showConfirmDeleteModal.networkName}{' '}
              {strings('asset_details.network')}
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
      </View>
    </ReusableModal>
  );
};

export default NetworkSelector;
