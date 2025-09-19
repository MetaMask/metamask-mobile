// Third party dependencies.
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';
import { NON_EVM_TESTNET_IDS } from '@metamask/multichain-network-controller';

// External dependencies.
import { strings } from '../../../../../locales/i18n.js';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast/index.ts';
import { ToastOptions } from '../../../../component-library/components/Toast/Toast.types.ts';
import { USER_INTENT } from '../../../../constants/permissions.ts';
import { MetaMetricsEvents } from '../../../../core/Analytics/index.ts';
import Engine from '../../../../core/Engine/index.ts';
import { selectAccountsLength } from '../../../../selectors/accountTrackerController.ts';
import Logger from '../../../../util/Logger/index.ts';
import {
  getHost,
  getUrlObj,
  prefixUrlWithProtocol,
} from '../../../../util/browser/index.ts';

// Internal dependencies.
import { PermissionsRequest } from '@metamask/permission-controller';
import PhishingModal from '../../../UI/PhishingModal/index.js';
import { useMetrics } from '../../../hooks/useMetrics/index.ts';
import Routes from '../../../../constants/navigation/Routes.ts';
import {
  MM_BLOCKLIST_ISSUE_URL,
  MM_ETHERSCAN_URL,
  MM_PHISH_DETECT_URL,
} from '../../../../constants/urls.ts';
import AppConstants from '../../../../core/AppConstants.ts';
import SDKConnect from '../../../../core/SDKConnect/SDKConnect.ts';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger.ts';
import { RootState } from '../../../../reducers/index.ts';
import { trackDappViewedEvent } from '../../../../util/metrics/index.ts';
import { useTheme } from '../../../../util/theme/index.ts';
import useFavicon from '../../../hooks/useFavicon/useFavicon.ts';
import {
  AccountConnectProps,
  AccountConnectScreens,
} from '../../AccountConnect/AccountConnect.types.ts';
import { getNetworkImageSource } from '../../../../util/networks/index.js';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar/index.ts';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController.ts';
import { isUUID } from '../../../../core/SDKConnect/utils/isUUID.ts';
import useOriginSource from '../../../hooks/useOriginSource.ts';
import {
  getCaip25PermissionsResponse,
  getRequestedCaip25CaveatValue,
} from '../../AccountConnect/utils.ts';
import {
  getPhishingTestResultAsync,
  isProductSafetyDappScanningEnabled,
} from '../../../../util/phishingDetection.ts';
import { CaipAccountId, CaipChainId } from '@metamask/utils';
import {
  Caip25EndowmentPermissionName,
  getAllNamespacesFromCaip25CaveatValue,
  getAllScopesFromCaip25CaveatValue,
  getAllScopesFromPermission,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import styleSheet from './MultichainAccountConnect.styles.ts';
import { useStyles } from '../../../../component-library/hooks/index.ts';
import { getApiAnalyticsProperties } from '../../../../util/metrics/MultichainAPI/getApiAnalyticsProperties.ts';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts.type.ts';
import { AccountGroupId } from '@metamask/account-api';
import { getCaip25AccountFromAccountGroupAndScope } from '../../../../util/multichain/getCaip25AccountFromAccountGroupAndScope.ts';
import MultichainPermissionsSummary, {
  MultichainPermissionsSummaryProps,
} from '../MultichainPermissionsSummary/MultichainPermissionsSummary.tsx';
import MultichainAccountConnectMultiSelector from './MultichainAccountConnectMultiSelector/MultichainAccountConnectMultiSelector.tsx';
import { getPermissions } from '../../../../selectors/snaps/index.ts';
import { useAccountGroupsForPermissions } from '../../../hooks/useAccountGroupsForPermissions/useAccountGroupsForPermissions.ts';
import NetworkConnectMultiSelector from '../../NetworkConnect/NetworkConnectMultiSelector/index.ts';
import { Box } from '@metamask/design-system-react-native';

const MultichainAccountConnect = (props: AccountConnectProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { hostInfo, permissionRequestId } = props.route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const previousIdentitiesListSize = useRef<number>();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [blockedUrl, setBlockedUrl] = useState('');

  const existingPermissionsForHost = useSelector((state: RootState) =>
    getPermissions(state, hostInfo?.metadata?.origin),
  );

  const existingPermissionsCaip25CaveatValue = useMemo(
    () =>
      getRequestedCaip25CaveatValue(
        existingPermissionsForHost,
        hostInfo?.metadata?.origin,
      ),
    [existingPermissionsForHost, hostInfo?.metadata?.origin],
  );

  const requestedCaip25CaveatValue = useMemo(
    () =>
      getRequestedCaip25CaveatValue(
        hostInfo.permissions,
        hostInfo.metadata.origin,
      ),
    [hostInfo.permissions, hostInfo.metadata.origin],
  );

  const requestedCaipAccountIds = useMemo(
    () => getCaipAccountIdsFromCaip25CaveatValue(requestedCaip25CaveatValue),
    [requestedCaip25CaveatValue],
  );

  const requestedCaipChainIds = useMemo(
    () => getAllScopesFromCaip25CaveatValue(requestedCaip25CaveatValue),
    [requestedCaip25CaveatValue],
  );

  const requestedNamespaces = useMemo(
    () => getAllNamespacesFromCaip25CaveatValue(requestedCaip25CaveatValue),
    [requestedCaip25CaveatValue],
  );

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const allNetworksList = useMemo(
    () => Object.keys(networkConfigurations) as CaipChainId[],
    [networkConfigurations],
  );

  const { wc2Metadata } = useSelector((state: RootState) => state.sdk);

  const { origin: channelIdOrHostname } = hostInfo.metadata;

  const isChannelId = isUUID(channelIdOrHostname);

  const sdkConnection = SDKConnect.getInstance().getConnection({
    channelId: channelIdOrHostname,
  });

  const isOriginMMSDKRemoteConn = sdkConnection !== undefined;

  const isOriginWalletConnect =
    !isOriginMMSDKRemoteConn && wc2Metadata?.id && wc2Metadata?.id.length > 0;

  const requestedCaipChainIdsWithDefaultSelectedChainIds = useMemo(
    () => Array.from(new Set([...requestedCaipChainIds, ...allNetworksList])),
    [requestedCaipChainIds, allNetworksList],
  );

  const {
    connectedAccountGroups,
    supportedAccountGroups,
    existingConnectedCaipAccountIds,
  } = useAccountGroupsForPermissions(
    existingPermissionsCaip25CaveatValue,
    requestedCaipAccountIds,
    requestedCaipChainIdsWithDefaultSelectedChainIds,
    requestedNamespaces,
  );

  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>(
    requestedCaipChainIdsWithDefaultSelectedChainIds,
  );

  const selectedNetworkAvatars = useMemo(
    () =>
      selectedChainIds
        .filter(
          (selectedChainId) => !NON_EVM_TESTNET_IDS.includes(selectedChainId),
        )
        .map((selectedChainId) => ({
          size: AvatarSize.Xs,
          name: networkConfigurations[selectedChainId]?.name || '',
          imageSource: getNetworkImageSource({ chainId: selectedChainId }),
          variant: AvatarVariant.Network,
          caipChainId: selectedChainId,
        })),
    [networkConfigurations, selectedChainIds],
  );

  const { suggestedAccountGroups, suggestedCaipAccountIds } = useMemo(() => {
    if (connectedAccountGroups.length > 0) {
      return {
        suggestedAccountGroups: connectedAccountGroups,
        suggestedCaipAccountIds: existingConnectedCaipAccountIds,
      };
    }

    if (supportedAccountGroups.length === 0) {
      return {
        suggestedAccountGroups: [],
        suggestedCaipAccountIds: [],
      };
    }

    // if there are no connected account groups, show the first supported account group
    const [firstSupportedAccountGroup] = supportedAccountGroups;

    return {
      suggestedAccountGroups: [firstSupportedAccountGroup],
      suggestedCaipAccountIds: getCaip25AccountFromAccountGroupAndScope(
        [firstSupportedAccountGroup],
        requestedCaipChainIdsWithDefaultSelectedChainIds,
      ),
    };
  }, [
    connectedAccountGroups,
    supportedAccountGroups,
    requestedCaipChainIdsWithDefaultSelectedChainIds,
    existingConnectedCaipAccountIds,
  ]);

  const [selectedAccountGroupIds, setSelectedAccountGroupIds] = useState<
    AccountGroupId[]
  >(
    suggestedAccountGroups.map(
      (group: AccountGroupWithInternalAccounts) => group.id,
    ),
  );

  const [selectedCaipAccountIds, setSelectedCaipAccountIds] = useState<
    CaipAccountId[]
  >(suggestedCaipAccountIds);

  const [screen, setScreen] = useState<AccountConnectScreens>(
    AccountConnectScreens.SingleConnect,
  );
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [userIntent, setUserIntent] = useState(USER_INTENT.None);
  const isMountedRef = useRef(true);

  const { toastRef } = useContext(ToastContext);

  const accountsLength = useSelector(selectAccountsLength);

  const dappUrl = sdkConnection?.originatorInfo?.url ?? '';

  const { domainTitle, hostname } = useMemo(() => {
    let title = strings('sdk.unknown');
    let dappHostname = dappUrl || channelIdOrHostname;
    if (
      isOriginMMSDKRemoteConn &&
      channelIdOrHostname.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)
    ) {
      title = getUrlObj(
        channelIdOrHostname.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, ''),
      ).origin;
    } else if (isOriginWalletConnect) {
      title =
        wc2Metadata?.lastVerifiedUrl ?? wc2Metadata?.url ?? channelIdOrHostname;
      dappHostname = title;
    } else if (!isChannelId && (dappUrl || channelIdOrHostname)) {
      title = prefixUrlWithProtocol(dappUrl || channelIdOrHostname);
      dappHostname = channelIdOrHostname;
    }
    return { domainTitle: title, hostname: dappHostname };
  }, [
    isOriginWalletConnect,
    isOriginMMSDKRemoteConn,
    isChannelId,
    dappUrl,
    channelIdOrHostname,
    wc2Metadata?.lastVerifiedUrl,
    wc2Metadata?.url,
  ]);

  const urlWithProtocol =
    hostname && !isUUID(hostname)
      ? prefixUrlWithProtocol(getHost(hostname))
      : domainTitle;

  const { hostname: hostnameFromUrlObj } = getUrlObj(urlWithProtocol);

  useEffect(() => {
    let url = dappUrl || channelIdOrHostname || '';

    const checkOrigin = async () => {
      if (isProductSafetyDappScanningEnabled()) {
        url = prefixUrlWithProtocol(url);
      }
      const scanResult = await getPhishingTestResultAsync(url);
      if (scanResult.result && isMountedRef.current) {
        setBlockedUrl(dappUrl);
        setShowPhishingModal(true);
      }
    };
    checkOrigin();
    return () => {
      isMountedRef.current = false;
    };
  }, [dappUrl, channelIdOrHostname]);

  const faviconSource = useFavicon(
    channelIdOrHostname || (!isChannelId ? channelIdOrHostname : ''),
  );

  const eventSource = useOriginSource({ origin: channelIdOrHostname });

  const suggestedAccountGroupIds = useMemo(
    () =>
      suggestedAccountGroups.map(
        (group: AccountGroupWithInternalAccounts) => group.id,
      ),
    [suggestedAccountGroups],
  );

  useEffect(() => {
    const currentLength = suggestedAccountGroupIds.length;

    if (previousIdentitiesListSize.current !== currentLength) {
      setSelectedAccountGroupIds(suggestedAccountGroupIds);
      setSelectedCaipAccountIds(suggestedCaipAccountIds);
      previousIdentitiesListSize.current = currentLength;
    }
  }, [suggestedAccountGroupIds, suggestedCaipAccountIds]);

  const cancelPermissionRequest = useCallback(
    (requestId: string) => {
      DevLogger.log(
        `AccountConnect::cancelPermissionRequest requestId=${requestId} channelIdOrHostname=${channelIdOrHostname} accountsLength=${accountsLength}`,
      );
      Engine.context.PermissionController.rejectPermissionsRequest(requestId);
      if (channelIdOrHostname && accountsLength === 0) {
        // Remove Potential SDK connection
        SDKConnect.getInstance().removeChannel({
          channelId: channelIdOrHostname,
          sendTerminate: true,
        });
      }

      const chainIds = getAllScopesFromPermission(
        hostInfo.permissions[Caip25EndowmentPermissionName] ?? {
          caveats: [],
        },
      );

      const isMultichainRequest = !hostInfo.metadata.isEip1193Request;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_REQUEST_CANCELLED)
          .addProperties({
            number_of_accounts: accountsLength,
            source: eventSource,
            chain_id_list: chainIds,
            referrer: channelIdOrHostname,
            ...getApiAnalyticsProperties(isMultichainRequest),
          })
          .build(),
      );
    },
    [
      accountsLength,
      channelIdOrHostname,
      trackEvent,
      createEventBuilder,
      eventSource,
      hostInfo.metadata.isEip1193Request,
      hostInfo.permissions,
    ],
  );

  const navigateToUrlInEthPhishingModal = useCallback(
    (url: string | null) => {
      setShowPhishingModal(false);
      cancelPermissionRequest(permissionRequestId);
      navigation.goBack();
      setIsLoading(false);

      if (url !== null) {
        navigation.navigate(Routes.BROWSER.HOME, {
          screen: Routes.BROWSER.VIEW,
          params: {
            newTabUrl: url,
            timestamp: Date.now(),
          },
        });
      }
    },
    [cancelPermissionRequest, navigation, permissionRequestId],
  );

  const continueToPhishingSite = useCallback(() => {
    setShowPhishingModal(false);
  }, []);

  const goToETHPhishingDetector = useCallback(() => {
    navigateToUrlInEthPhishingModal(MM_PHISH_DETECT_URL);
  }, [navigateToUrlInEthPhishingModal]);

  const goToFilePhishingIssue = useCallback(() => {
    navigateToUrlInEthPhishingModal(MM_BLOCKLIST_ISSUE_URL);
  }, [navigateToUrlInEthPhishingModal]);

  const goToEtherscam = useCallback(() => {
    navigateToUrlInEthPhishingModal(MM_ETHERSCAN_URL);
  }, [navigateToUrlInEthPhishingModal]);

  const goBackToSafety = useCallback(() => {
    navigateToUrlInEthPhishingModal(null); // No URL means just go back to safety without navigating to a new page
  }, [navigateToUrlInEthPhishingModal]);

  const triggerDappViewedEvent = useCallback(
    (numberOfConnectedAccounts: number) =>
      // Track dapp viewed event
      trackDappViewedEvent({
        hostname: hostnameFromUrlObj,
        numberOfConnectedAccounts,
      }),
    [hostnameFromUrlObj],
  );

  const handleConnect = useCallback(async () => {
    const request: PermissionsRequest = {
      ...hostInfo,
      metadata: {
        ...hostInfo.metadata,
        origin: channelIdOrHostname,
      },
      permissions: {
        ...hostInfo.permissions,
        ...getCaip25PermissionsResponse(
          requestedCaip25CaveatValue,
          selectedCaipAccountIds,
          selectedChainIds,
        ),
      },
    };

    const connectedAccountLength = selectedAccountGroupIds.length;
    const isMultichainRequest = !hostInfo.metadata.isEip1193Request;

    try {
      setIsLoading(true);
      await Engine.context.PermissionController.acceptPermissionsRequest(
        request,
      );

      triggerDappViewedEvent(connectedAccountLength);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_REQUEST_COMPLETED)
          .addProperties({
            number_of_accounts: accountsLength,
            number_of_accounts_connected: connectedAccountLength,
            // TODO: Fix this. Not accurate
            account_type: 'multichain',
            source: eventSource,
            chain_id_list: selectedChainIds,
            referrer: request.metadata.origin,
            ...getApiAnalyticsProperties(isMultichainRequest),
          })
          .build(),
      );

      const labelOptions: ToastOptions['labelOptions'] =
        connectedAccountLength >= 1
          ? [{ label: strings('toast.permissions_updated') }]
          : [];

      toastRef?.current?.showToast({
        variant: ToastVariants.Network,
        labelOptions,
        networkImageSource: faviconSource,
        hasNoTimeout: false,
      });
    } catch (e) {
      if (e instanceof Error) {
        Logger.error(e, 'Error while trying to connect to a dApp.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    hostInfo,
    channelIdOrHostname,
    requestedCaip25CaveatValue,
    selectedCaipAccountIds,
    selectedChainIds,
    selectedAccountGroupIds.length,
    triggerDappViewedEvent,
    trackEvent,
    createEventBuilder,
    accountsLength,
    eventSource,
    toastRef,
    faviconSource,
  ]);

  const handleAccountGroupsSelected = useCallback(
    (newSelectedAccountGroupIds: AccountGroupId[]) => {
      const updatedSelectedChains = [...selectedChainIds];

      // Create lookup sets for selected account group IDs
      const selectedGroupIds = new Set(newSelectedAccountGroupIds);

      // Filter to only selected account groups
      const selectedAccountGroups = supportedAccountGroups.filter(
        (group: AccountGroupWithInternalAccounts) =>
          selectedGroupIds.has(group.id),
      );

      const caip25AccountIds = getCaip25AccountFromAccountGroupAndScope(
        selectedAccountGroups,
        updatedSelectedChains,
      );

      setSelectedChainIds(updatedSelectedChains);
      setSelectedAccountGroupIds(
        selectedAccountGroups.map(
          (group: AccountGroupWithInternalAccounts) => group.id,
        ),
      );
      setSelectedCaipAccountIds(caip25AccountIds);
      setScreen(AccountConnectScreens.SingleConnect);
    },
    [selectedChainIds, supportedAccountGroups],
  );

  const handleNetworksSelected = useCallback(
    (newSelectedChainIds: CaipChainId[]) => {
      setSelectedChainIds(newSelectedChainIds);
      setScreen(AccountConnectScreens.SingleConnect);
    },
    [setScreen, setSelectedChainIds],
  );

  const handleConfirm = useCallback(async () => {
    await handleConnect();
    navigation.goBack();
  }, [handleConnect, navigation]);

  /**
   * User intent is set on AccountConnectSingle,
   * AccountConnectSingleSelector & AccountConnectMultiSelector.
   *
   * We need to know where the user clicks to decide what
   * should happen to the Permission Request Promise.
   * We then trigger the corresponding side effects &
   * control the Bottom Sheet visibility.
   */
  useEffect(() => {
    if (userIntent === USER_INTENT.None) return;

    const handleUserActions = (action: USER_INTENT) => {
      switch (action) {
        case USER_INTENT.Confirm: {
          handleConfirm();
          break;
        }
        case USER_INTENT.Cancel: {
          cancelPermissionRequest(permissionRequestId);
          navigation.goBack();
          break;
        }
      }
    };

    handleUserActions(userIntent);

    setUserIntent(USER_INTENT.None);
  }, [
    navigation,
    userIntent,
    cancelPermissionRequest,
    permissionRequestId,
    handleConfirm,
  ]);

  const permissionsSummaryProps = useMemo(
    (): MultichainPermissionsSummaryProps => ({
      currentPageInformation: {
        currentEnsName: '',
        icon: typeof faviconSource === 'string' ? faviconSource : '',
        url: urlWithProtocol,
      },
      onEdit: () => setScreen(AccountConnectScreens.MultiConnectSelector),
      onEditNetworks: () =>
        setScreen(AccountConnectScreens.MultiConnectNetworkSelector),
      onConfirm: handleConfirm,
      onCancel: () => {
        cancelPermissionRequest(permissionRequestId);
        navigation.goBack();
      },
      isAlreadyConnected: false,
      selectedAccountGroupIds,
      networkAvatars: selectedNetworkAvatars,
      setTabIndex,
      tabIndex,
    }),
    [
      faviconSource,
      urlWithProtocol,
      handleConfirm,
      selectedAccountGroupIds,
      selectedNetworkAvatars,
      tabIndex,
      cancelPermissionRequest,
      permissionRequestId,
      navigation,
    ],
  );

  const renderPermissionsSummaryScreen = useCallback(
    () => <MultichainPermissionsSummary {...permissionsSummaryProps} />,
    [permissionsSummaryProps],
  );

  const renderMultiConnectSelectorScreen = useCallback(
    () => (
      <MultichainAccountConnectMultiSelector
        accountGroups={supportedAccountGroups}
        defaultSelectedAccountGroupIds={selectedAccountGroupIds}
        onSubmit={handleAccountGroupsSelected}
        isLoading={isLoading}
        onBack={() => {
          setScreen(AccountConnectScreens.SingleConnect);
        }}
        connection={sdkConnection}
        hostname={hostnameFromUrlObj}
        screenTitle={strings('accounts.edit_accounts_title')}
        onUserAction={setUserIntent}
        isRenderedAsBottomSheet={false}
        showDisconnectAllButton={false}
      />
    ),
    [
      supportedAccountGroups,
      selectedAccountGroupIds,
      handleAccountGroupsSelected,
      isLoading,
      sdkConnection,
      hostnameFromUrlObj,
    ],
  );

  const renderMultiConnectNetworkSelectorScreen = useCallback(
    () => (
      <NetworkConnectMultiSelector
        onSubmit={handleNetworksSelected}
        isLoading={isLoading}
        hostname={hostnameFromUrlObj}
        onBack={() => setScreen(AccountConnectScreens.SingleConnect)}
        defaultSelectedChainIds={selectedChainIds}
      />
    ),
    [isLoading, handleNetworksSelected, hostnameFromUrlObj, selectedChainIds],
  );

  const renderPhishingModal = useCallback(
    () => (
      <Modal
        isVisible={showPhishingModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={1}
        backdropColor={colors.error.default}
        animationInTiming={300}
        animationOutTiming={300}
        useNativeDriver
      >
        <PhishingModal
          fullUrl={blockedUrl}
          goToETHPhishingDetector={goToETHPhishingDetector}
          continueToPhishingSite={continueToPhishingSite}
          goToEtherscam={goToEtherscam}
          goToFilePhishingIssue={goToFilePhishingIssue}
          goBackToSafety={goBackToSafety}
        />
      </Modal>
    ),
    [
      blockedUrl,
      colors.error.default,
      continueToPhishingSite,
      goBackToSafety,
      goToETHPhishingDetector,
      goToEtherscam,
      goToFilePhishingIssue,
      showPhishingModal,
    ],
  );

  const renderConnectScreens = useCallback(() => {
    switch (screen) {
      case AccountConnectScreens.SingleConnect:
        return renderPermissionsSummaryScreen();
      case AccountConnectScreens.MultiConnectSelector:
        return renderMultiConnectSelectorScreen();
      case AccountConnectScreens.MultiConnectNetworkSelector:
        return renderMultiConnectNetworkSelectorScreen();
    }
  }, [
    screen,
    renderPermissionsSummaryScreen,
    renderMultiConnectSelectorScreen,
    renderMultiConnectNetworkSelectorScreen,
  ]);

  return (
    <Box style={styles.container}>
      {renderConnectScreens()}
      {renderPhishingModal()}
    </Box>
  );
};

export default MultichainAccountConnect;
