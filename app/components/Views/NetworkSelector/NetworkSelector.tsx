// Third party dependencies.
import {
  ImageSourcePropType,
  KeyboardAvoidingView,
  Linking,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import images from 'images/image-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

// External dependencies.
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useSelector } from 'react-redux';
import {
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import {
  selectShowTestNetworks,
  selectTokenNetworkFilter,
} from '../../../selectors/preferencesController';
import Networks, {
  getAllNetworks,
  getDecimalChainId,
  isTestNet,
  getNetworkImageSource,
  isMainNet,
  isPortfolioViewEnabled,
  isMultichainV1Enabled,
} from '../../../util/networks';
import { LINEA_MAINNET, MAINNET } from '../../../constants/network';
import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Network/NetworkListModal.selectors';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { useMetrics } from '../../../components/hooks/useMetrics';

// Internal dependencies
import createStyles from './NetworkSelector.styles';
import {
  BUILT_IN_NETWORKS,
  InfuraNetworkType,
} from '@metamask/controller-utils';
import InfoModal from '../../../../app/components/UI/Swaps/components/InfoModal';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import CustomNetwork from '../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { NetworksSelectorSelectorsIDs } from '../../../../e2e/selectors/Settings/NetworksView.selectors';
import { PopularList } from '../../../util/networks/customNetworks';
import NetworkSearchTextInput from './NetworkSearchTextInput';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import AccountAction from '../AccountAction';
import { ButtonsAlignment } from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ExtendedNetwork } from '../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
import { Hex } from '@metamask/utils';
import hideProtocolFromUrl from '../../../util/hideProtocolFromUrl';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import { NetworkConfiguration } from '@metamask/network-controller';
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
import Device from '../../../util/device';
import Logger from '../../../util/Logger';

interface infuraNetwork {
  name: string;
  imageSource: ImageSourcePropType;
  chainId: Hex;
}

interface ShowConfirmDeleteModalState {
  isVisible: boolean;
  networkName: string;
  chainId?: `0x${string}`;
}

interface NetworkSelectorRouteParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
}

const NetworkSelector = () => {
  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState<ExtendedNetwork>();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [searchString, setSearchString] = useState('');
  const { navigate } = useNavigation();
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = theme;
  const styles = createStyles(colors);
  // const sheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = useRef<ReusableModalRef>(null);
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const isAllNetwork = useSelector(selectIsAllNetworks);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const safeAreaInsets = useSafeAreaInsets();

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const route =
    useRoute<RouteProp<Record<string, NetworkSelectorRouteParams>, string>>();

  // origin is defined if network selector is opened from a dapp
  const origin = route.params?.hostInfo?.metadata?.origin || '';
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

  const KEYBOARD_OFFSET = 120;
  const avatarSize = isNetworkUiRedesignEnabled() ? AvatarSize.Sm : undefined;
  const modalTitle = isNetworkUiRedesignEnabled()
    ? 'networks.additional_network_information_title'
    : 'networks.network_warning_title';
  const modalDescription = isNetworkUiRedesignEnabled()
    ? 'networks.additonial_network_information_desc'
    : 'networks.network_warning_desc';
  const buttonLabelAddNetwork = isNetworkUiRedesignEnabled()
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

  const setTokenNetworkFilter = useCallback(
    (chainId: string) => {
      const isPopularNetwork =
        chainId === CHAIN_IDS.MAINNET ||
        chainId === CHAIN_IDS.LINEA_MAINNET ||
        PopularList.some((network) => network.chainId === chainId);
      const { PreferencesController } = Engine.context;
      if (!isAllNetwork && isPopularNetwork) {
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
      }
    },
    [isAllNetwork],
  );

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

  const onSetRpcTarget = async (networkConfiguration: NetworkConfiguration) => {
    const { NetworkController, SelectedNetworkController } = Engine.context;
    trace({
      name: TraceName.SwitchCustomNetwork,
      parentContext: parentSpan,
      op: TraceOperation.SwitchCustomNetwork,
    });
    if (networkConfiguration) {
      const {
        name: nickname,
        chainId,
        rpcEndpoints,
        defaultRpcEndpointIndex,
      } = networkConfiguration;

      const networkConfigurationId =
        rpcEndpoints[defaultRpcEndpointIndex].networkClientId;

      if (domainIsConnectedDapp && isMultichainV1Enabled()) {
        SelectedNetworkController.setNetworkClientIdForDomain(
          origin,
          networkConfigurationId,
        );
      } else {
        const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];
        try {
          await NetworkController.setActiveNetwork(networkClientId);
        } catch (error) {
          Logger.error(new Error(`Error in setActiveNetwork: ${error}`));
        }
      }

      setTokenNetworkFilter(chainId);
      if (!(domainIsConnectedDapp && isMultichainV1Enabled())) sheetRef.current?.dismissModal();
      endTrace({ name: TraceName.SwitchCustomNetwork });
      endTrace({ name: TraceName.NetworkSwitch });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
          .addProperties({
            chain_id: getDecimalChainId(chainId),
            from_network: selectedNetworkName,
            to_network: nickname,
          })
          .build(),
      );
    }
  };

  const showRpcSelector = Object.values(networkConfigurations).some(
    (networkConfiguration) =>
      networkConfiguration.rpcEndpoints &&
      networkConfiguration.rpcEndpoints.length > 1,
  );

  const openRpcModal = useCallback(({ chainId, networkName }) => {
    setShowMultiRpcSelectModal({
      isVisible: true,
      chainId,
      networkName,
    });
    rpcMenuSheetRef.current?.onOpenBottomSheet();
  }, []);

  const closeRpcModal = useCallback(() => {
    setShowMultiRpcSelectModal({
      isVisible: false,
      chainId: CHAIN_IDS.MAINNET,
      networkName: '',
    });
    rpcMenuSheetRef.current?.onCloseBottomSheet();
  }, []);

  const openModal = useCallback(
    (chainId, displayEdit, networkTypeOrRpcUrl, isReadOnly) => {
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

  // The only possible value types are mainnet, linea-mainnet, sepolia and linea-sepolia
  const onNetworkChange = async (type: InfuraNetworkType) => {
    trace({
      name: TraceName.SwitchBuiltInNetwork,
      parentContext: parentSpan,
      op: TraceOperation.SwitchBuiltInNetwork,
    });
    const {
      NetworkController,
      AccountTrackerController,
      SelectedNetworkController,
    } = Engine.context;
    if (domainIsConnectedDapp && isMultichainV1Enabled()) {
      SelectedNetworkController.setNetworkClientIdForDomain(origin, type);
    } else {
      const networkConfiguration =
        networkConfigurations[BUILT_IN_NETWORKS[type].chainId];

      const clientId =
        networkConfiguration?.rpcEndpoints[
          networkConfiguration.defaultRpcEndpointIndex
        ].networkClientId ?? type;

      setTokenNetworkFilter(networkConfiguration.chainId);
      await NetworkController.setActiveNetwork(clientId);

      closeRpcModal();
      AccountTrackerController.refresh();

      setTimeout(async () => {
        await updateIncomingTransactions([networkConfiguration.chainId]);
      }, 1000);
    }

    sheetRef.current?.dismissModal();
    endTrace({ name: TraceName.SwitchBuiltInNetwork });
    endTrace({ name: TraceName.NetworkSwitch });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
        .addProperties({
          chain_id: getDecimalChainId(selectedChainId),
          from_network: selectedNetworkName,
          to_network: type,
        })
        .build(),
    );
  };

  const filterNetworksByName = (
    networks: ExtendedNetwork[],
    networkName: string,
  ) => {
    const searchResult: ExtendedNetwork[] = networks.filter(({ name }) =>
      name?.toLowerCase().includes(networkName.toLowerCase()),
    );

    return searchResult;
  };

  const isNoSearchResults = (networkIdenfier: string) => {
    if (!searchString || !networkIdenfier) {
      return false;
    }

    if (networkIdenfier === MAINNET || networkIdenfier === LINEA_MAINNET) {
      const networkIdentified = Networks[
        networkIdenfier
      ] as unknown as ExtendedNetwork;
      return (
        filterNetworksByName([networkIdentified], searchString).length === 0
      );
    }

    return !networkIdenfier.includes(searchString);
  };

  const renderMainnet = () => {
    const { name: mainnetName, chainId } = Networks.mainnet;
    const rpcUrl =
      networkConfigurations?.[chainId]?.rpcEndpoints?.[
        networkConfigurations?.[chainId]?.defaultRpcEndpointIndex
      ].url;
    const name = networkConfigurations?.[chainId]?.name ?? mainnetName;

    if (isNetworkUiRedesignEnabled() && isNoSearchResults(MAINNET)) return null;

    if (isNetworkUiRedesignEnabled()) {
      return (
        <Cell
          key={chainId}
          variant={CellVariant.SelectWithMenu}
          title={name}
          secondaryText={
            showRpcSelector
              ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
              : undefined
          }
          avatarProps={{
            variant: AvatarVariant.Network,
            name: mainnetName,
            imageSource: images.ETHEREUM,
            size: AvatarSize.Sm,
          }}
          isSelected={chainId === selectedChainId}
          onPress={() => onNetworkChange(MAINNET)}
          style={styles.networkCell}
          buttonIcon={IconName.MoreVertical}
          buttonProps={{
            onButtonClick: () => {
              openModal(chainId, false, MAINNET, true);
            },
          }}
          onTextClick={() =>
            openRpcModal({
              chainId,
              networkName: mainnetName,
            })
          }
          onLongPress={() => {
            openModal(chainId, false, MAINNET, true);
          }}
        />
      );
    }

    return (
      <Cell
        variant={CellVariant.Select}
        title={name}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: mainnetName,
          imageSource: images.ETHEREUM,
          size: avatarSize,
        }}
        isSelected={chainId === selectedChainId}
        onPress={() => onNetworkChange(MAINNET)}
        style={styles.networkCell}
      />
    );
  };

  const renderLineaMainnet = () => {
    const { name: lineaMainnetName, chainId } = Networks['linea-mainnet'];
    const name = networkConfigurations?.[chainId]?.name ?? lineaMainnetName;
    const rpcUrl =
      networkConfigurations?.[chainId]?.rpcEndpoints?.[
        networkConfigurations?.[chainId]?.defaultRpcEndpointIndex
      ].url;

    if (isNetworkUiRedesignEnabled() && isNoSearchResults('linea-mainnet'))
      return null;

    if (isNetworkUiRedesignEnabled()) {
      return (
        <Cell
          key={chainId}
          variant={CellVariant.SelectWithMenu}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: lineaMainnetName,
            imageSource: images['LINEA-MAINNET'],
            size: AvatarSize.Sm,
          }}
          isSelected={chainId === selectedChainId}
          onPress={() => onNetworkChange(LINEA_MAINNET)}
          style={styles.networkCell}
          buttonIcon={IconName.MoreVertical}
          secondaryText={
            showRpcSelector
              ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
              : undefined
          }
          buttonProps={{
            onButtonClick: () => {
              openModal(chainId, false, LINEA_MAINNET, true);
            },
          }}
          onTextClick={() =>
            openRpcModal({
              chainId,
              networkName: lineaMainnetName,
            })
          }
          onLongPress={() => {
            openModal(chainId, false, LINEA_MAINNET, true);
          }}
        />
      );
    }

    return (
      <Cell
        variant={CellVariant.Select}
        title={name}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: lineaMainnetName,
          imageSource: images['LINEA-MAINNET'],
          size: avatarSize,
        }}
        isSelected={chainId === selectedChainId}
        onPress={() => onNetworkChange(LINEA_MAINNET)}
      />
    );
  };

  const renderRpcNetworks = () =>
    Object.values(networkConfigurations).map((networkConfiguration) => {
      const {
        name: nickname,
        rpcEndpoints,
        chainId,
        defaultRpcEndpointIndex,
      } = networkConfiguration;
      if (
        !chainId ||
        isTestNet(chainId) ||
        isMainNet(chainId) ||
        chainId === CHAIN_IDS.LINEA_MAINNET ||
        chainId === CHAIN_IDS.GOERLI
      ) {
        return null;
      }

      const rpcUrl = rpcEndpoints[defaultRpcEndpointIndex].url;
      const rpcName = rpcEndpoints[defaultRpcEndpointIndex].name ?? rpcUrl;

      const name = nickname || rpcName;

      if (isNetworkUiRedesignEnabled() && isNoSearchResults(name)) return null;

      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      const image = getNetworkImageSource({ chainId: chainId?.toString() });

      if (isNetworkUiRedesignEnabled()) {
        return (
          <Cell
            key={chainId}
            variant={CellVariant.SelectWithMenu}
            title={name}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: image,
              size: AvatarSize.Sm,
            }}
            isSelected={Boolean(chainId === selectedChainId)}
            onPress={() => onSetRpcTarget(networkConfiguration)}
            style={styles.networkCell}
            buttonIcon={IconName.MoreVertical}
            secondaryText={
              showRpcSelector
                ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
                : undefined
            }
            buttonProps={{
              onButtonClick: () => {
                openModal(chainId, true, rpcUrl, false);
              },
            }}
            onTextClick={() =>
              openRpcModal({
                chainId,
                networkName: name,
              })
            }
            onLongPress={() => {
              openModal(chainId, true, rpcUrl, false);
            }}
          />
        );
      }

      return (
        <Cell
          key={`${chainId}-${rpcUrl}`}
          testID={NetworkListModalSelectorsIDs.CUSTOM_NETWORK_CELL(name)}
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name,
            imageSource: image,
            size: avatarSize,
          }}
          isSelected={Boolean(chainId === selectedChainId)}
          onPress={() => onSetRpcTarget(networkConfiguration)}
          style={styles.networkCell}
        >
          {Boolean(
            chainId === selectedChainId && selectedRpcUrl === rpcUrl,
          ) && <View testID={`${name}-selected`} />}
        </Cell>
      );
    });

  const renderOtherNetworks = () => {
    const getAllNetworksTyped =
      getAllNetworks() as unknown as InfuraNetworkType[];
    const getOtherNetworks = () => getAllNetworksTyped.slice(2);
    return getOtherNetworks().map((networkType: InfuraNetworkType) => {
      const TypedNetworks = Networks as unknown as Record<
        string,
        infuraNetwork
      >;
      const { name, imageSource, chainId } = TypedNetworks[networkType];

      const networkConfiguration = networkConfigurations[chainId];

      const rpcEndpoints = networkConfiguration?.rpcEndpoints;

      const rpcUrl =
        rpcEndpoints?.[networkConfiguration?.defaultRpcEndpointIndex].url;

      if (isNetworkUiRedesignEnabled() && isNoSearchResults(name)) return null;

      if (isNetworkUiRedesignEnabled()) {
        return (
          <Cell
            key={chainId}
            variant={CellVariant.SelectWithMenu}
            secondaryText={
              showRpcSelector
                ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
                : undefined
            }
            title={name}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource,
              size: AvatarSize.Sm,
            }}
            isSelected={chainId === selectedChainId}
            onPress={() => onNetworkChange(networkType)}
            style={styles.networkCell}
            buttonIcon={IconName.MoreVertical}
            buttonProps={{
              onButtonClick: () => {
                openModal(chainId, false, networkType, true);
              },
            }}
            onTextClick={() =>
              openRpcModal({
                chainId,
                networkName: name,
              })
            }
            onLongPress={() => {
              openModal(chainId, false, networkType, true);
            }}
          />
        );
      }

      return (
        <Cell
          key={chainId}
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name,
            imageSource,
            size: avatarSize,
          }}
          isSelected={chainId === selectedChainId}
          onPress={() => onNetworkChange(networkType)}
          style={styles.networkCell}
        />
      );
    });
  };

  const goToNetworkSettings = () => {
    sheetRef.current?.dismissModal(() => {
      navigate(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
      });
    });
  };

  const renderTestNetworksSwitch = () => (
    <View style={styles.switchContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings('networks.show_test_networks')}
      </Text>
      <Switch
        onValueChange={(value: boolean) => {
          const { PreferencesController } = Engine.context;
          PreferencesController.setShowTestNetworks(value);
        }}
        value={isTestNet(selectedChainId) || showTestNetworks}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={theme.brandColors.white}
        ios_backgroundColor={colors.border.muted}
        testID={NetworkListModalSelectorsIDs.TEST_NET_TOGGLE}
        disabled={isTestNet(selectedChainId)}
      />
    </View>
  );

  const renderAdditonalNetworks = () => {
    let filteredNetworks;

    if (isNetworkUiRedesignEnabled() && searchString.length > 0)
      filteredNetworks = PopularList.filter(({ nickname }) =>
        nickname.toLowerCase().includes(searchString.toLowerCase()),
      );

    return (
      <View style={styles.addtionalNetworksContainer}>
        <CustomNetwork
          isNetworkModalVisible={showPopularNetworkModal}
          closeNetworkModal={onCancel}
          selectedNetwork={popularNetwork}
          toggleWarningModal={toggleWarningModal}
          showNetworkModal={showNetworkModal}
          switchTab={undefined}
          shouldNetworkSwitchPopToWallet={false}
          customNetworksList={
            searchString.length > 0 ? filteredNetworks : undefined
          }
          showCompletionMessage={false}
          showPopularNetworkModal
          hideWarningIcons
        />
      </View>
    );
  };

  const renderPopularNetworksTitle = () => (
    <View style={styles.popularNetworkTitleContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings('networks.additional_networks')}
      </Text>
      <TouchableOpacity
        testID={NetworkListModalSelectorsIDs.TOOLTIP}
        style={styles.gasInfoContainer}
        onPress={toggleWarningModal}
        hitSlop={styles.hitSlop}
      >
        <MaterialCommunityIcons
          name="information"
          size={14}
          style={styles.gasInfoIcon}
        />
      </TouchableOpacity>
    </View>
  );

  const renderEnabledNetworksTitle = () => (
    <View style={styles.switchContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings('networks.enabled_networks')}
      </Text>
    </View>
  );

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

      // set tokenNetworkFilter
      if (isPortfolioViewEnabled()) {
        const { PreferencesController } = Engine.context;
        if (!isAllNetwork) {
          PreferencesController.setTokenNetworkFilter({
            [chainId]: true,
          });
        } else {
          // Remove the chainId from the tokenNetworkFilter
          const { [chainId]: _, ...newTokenNetworkFilter } = tokenNetworkFilter;
          PreferencesController.setTokenNetworkFilter({
            // TODO fix type of preferences controller level
            // setTokenNetworkFilter in preferences controller accepts Record<string, boolean> while tokenNetworkFilter is Record<string, string>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(newTokenNetworkFilter as any),
          });
        }
      }

      setShowConfirmDeleteModal({
        isVisible: false,
        networkName: '',
      });
    }
  };

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

  const renderBottomSheetContent = () => (
    <>
      {isNetworkUiRedesignEnabled() &&
        searchString.length === 0 &&
        renderEnabledNetworksTitle()}
      {renderMainnet()}
      {renderLineaMainnet()}
      {renderRpcNetworks()}
      {isNetworkUiRedesignEnabled() &&
        searchString.length === 0 &&
        renderPopularNetworksTitle()}
      {isNetworkUiRedesignEnabled() && renderAdditonalNetworks()}
      {searchString.length === 0 && renderTestNetworksSwitch()}
      {showTestNetworks && renderOtherNetworks()}
    </>
  );

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
          behavior={Device.isIos() ? undefined : 'height'}
          keyboardVerticalOffset={KEYBOARD_OFFSET}
          enabled
        >
          <ScrollView
            style={styles.scrollableDescription}
            keyboardShouldPersistTaps="handled"
            testID={NetworkListModalSelectorsIDs.SCROLL}
          >
            {renderBottomSheetContent()}
          </ScrollView>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings(buttonLabelAddNetwork)}
            onPress={goToNetworkSettings}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.addNetworkButton}
            testID={NetworkListModalSelectorsIDs.ADD_BUTTON}
          />
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
      </View>
    </ReusableModal>
  );
};

export default NetworkSelector;
