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
import { strings } from '../../../../../locales/i18n';
import { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { ToastOptions } from '../../../../component-library/components/Toast/Toast.types';
import { USER_INTENT } from '../../../../constants/permissions';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import { selectAccountsLength } from '../../../../selectors/accountTrackerController';
import Logger from '../../../../util/Logger';
import {
  getHost,
  getUrlObj,
  prefixUrlWithProtocol,
} from '../../../../util/browser';

// Internal dependencies.
import { PermissionsRequest } from '@metamask/permission-controller';
import PhishingModal from '../../../../components/UI/PhishingModal';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import Routes from '../../../../constants/navigation/Routes';
import {
  MM_BLOCKLIST_ISSUE_URL,
  MM_ETHERSCAN_URL,
  MM_PHISH_DETECT_URL,
} from '../../../../constants/urls';
import AppConstants from '../../../../core/AppConstants';
import SDKConnect from '../../../../core/SDKConnect/SDKConnect';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { RootState } from '../../../../reducers';
import { trackDappViewedEvent } from '../../../../util/metrics';
import { useTheme } from '../../../../util/theme';
import useFavicon from '../../../../components/hooks/useFavicon/useFavicon';
import {
  AccountConnectProps,
  AccountConnectScreens,
} from '../AccountConnect.types';
import { getNetworkImageSource } from '../../../../util/networks';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import { isUUID } from '../../../../core/SDKConnect/utils/isUUID';
import useOriginSource from '../../../hooks/useOriginSource';
import {
  getCaip25PermissionsResponse,
  getRequestedCaip25CaveatValue,
  getDefaultSelectedChainIds,
} from '../utils';
import {
  getPhishingTestResultAsync,
  isProductSafetyDappScanningEnabled,
} from '../../../../util/phishingDetection';
import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import {
  Caip25EndowmentPermissionName,
  getAllNamespacesFromCaip25CaveatValue,
  getAllScopesFromCaip25CaveatValue,
  getAllScopesFromPermission,
} from '@metamask/chain-agnostic-permission';
import styleSheet from './MultichainAccountConnect.styles.ts';
import { useStyles } from '../../../../component-library/hooks';
import { getApiAnalyticsProperties } from '../../../../util/metrics/MultichainAPI/getApiAnalyticsProperties';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts.type';
import { AccountGroupId } from '@metamask/account-api';
import MultichainPermissionsSummary, {
  MultichainPermissionsSummaryProps,
} from '../../MultichainAccounts/MultichainPermissionsSummary/MultichainPermissionsSummary.tsx';
import MultichainAccountConnectMultiSelector from './MultichainAccountConnectMultiSelector/MultichainAccountConnectMultiSelector';
import { getPermissions } from '../../../../selectors/snaps';
import { useAccountGroupsForPermissions } from '../../../hooks/useAccountGroupsForPermissions/useAccountGroupsForPermissions';
import { selectAccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import NetworkConnectMultiSelector from '../../NetworkConnect/NetworkConnectMultiSelector';
import { Box } from '@metamask/design-system-react-native';

const getCaip25AccountFromAccountGroupAndScope = (
  accountGroups: AccountGroupWithInternalAccounts[],
  scopes: CaipChainId[],
) => {
  // Pre-parse all chain namespaces and cache common strings
  const chainNamespaces = new Map<CaipChainId, string>();
  const eip155Scope = `${KnownCaipNamespace.Eip155}:0`;
  scopes.forEach((chainId) => {
    try {
      const { namespace } = parseCaipChainId(chainId);
      chainNamespaces.set(chainId, namespace);
    } catch (err) {
      // Skip invalid chain IDs
    }
  });

  // Build account addresses more efficiently
  const updatedSelectedCaipAccountAddresses = new Set<CaipAccountId>();

  // Process each selected account group
  accountGroups.forEach((accountGroup) => {
    accountGroup.accounts.forEach((account) => {
      // Convert scopes to Set for O(1) lookup
      const accountScopesSet = new Set(account.scopes);

      // Check each selected chain
      scopes.forEach((chainId) => {
        const namespace = chainNamespaces.get(chainId);
        if (!namespace) {
          return;
        }

        let shouldAdd = false;

        if (namespace === KnownCaipNamespace.Eip155) {
          shouldAdd = accountScopesSet.has(eip155Scope);
        } else {
          shouldAdd = accountScopesSet.has(chainId);
        }

        if (shouldAdd) {
          updatedSelectedCaipAccountAddresses.add(
            `${chainId}:${account.address}`,
          );
        }
      });
    });
  });

  return Array.from(updatedSelectedCaipAccountAddresses);
};

const MultichainAccountConnect = (props: AccountConnectProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { hostInfo, permissionRequestId } = props.route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const previousIdentitiesListSize = useRef<number>();
  const accountGroups = useSelector(selectAccountGroupWithInternalAccounts);
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
  const allNetworksList = Object.keys(networkConfigurations) as CaipChainId[];

  const supportedRequestedCaipChainIds = requestedCaipChainIds.filter(
    (caipChainId) => allNetworksList.includes(caipChainId as CaipChainId),
  );

  const {
    connectedAccountGroups,
    supportedAccountGroups,
    existingConnectedCaipAccountIds,
  } = useAccountGroupsForPermissions(
    existingPermissionsCaip25CaveatValue,
    requestedCaipChainIds,
    requestedNamespaces,
  );

  const { wc2Metadata } = useSelector((state: RootState) => state.sdk);

  const { origin: channelIdOrHostname, isEip1193Request } = hostInfo.metadata;

  const isChannelId = isUUID(channelIdOrHostname);

  const sdkConnection = SDKConnect.getInstance().getConnection({
    channelId: channelIdOrHostname,
  });

  const isOriginMMSDKRemoteConn = sdkConnection !== undefined;

  const isOriginWalletConnect =
    !isOriginMMSDKRemoteConn && wc2Metadata?.id && wc2Metadata?.id.length > 0;

  const defaultSelectedChainIds = useMemo(
    () =>
      getDefaultSelectedChainIds({
        isEip1193Request: Boolean(isEip1193Request),
        isOriginWalletConnect: Boolean(isOriginWalletConnect),
        isOriginMMSDKRemoteConn: Boolean(isOriginMMSDKRemoteConn),
        origin: channelIdOrHostname,
        allNetworksList,
        supportedRequestedCaipChainIds,
        requestedNamespaces,
      }),
    [
      isEip1193Request,
      isOriginWalletConnect,
      isOriginMMSDKRemoteConn,
      channelIdOrHostname,
      allNetworksList,
      supportedRequestedCaipChainIds,
      requestedNamespaces,
    ],
  );

  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>(
    defaultSelectedChainIds,
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

    // if there are no connected account groups, show the first supported account gruop
    const [firstSupportedAccountGroup] = supportedAccountGroups;

    return {
      suggestedAccountGroups: [firstSupportedAccountGroup],
      suggestedCaipAccountIds: getCaip25AccountFromAccountGroupAndScope(
        [firstSupportedAccountGroup],
        selectedChainIds,
      ),
    };
  }, [
    connectedAccountGroups,
    existingConnectedCaipAccountIds,
    selectedChainIds,
    supportedAccountGroups,
  ]);

  const [selectedAccountGroupIds, setSelectedAccountGroupIds] = useState<
    AccountGroupId[]
  >(
    Array.from(suggestedAccountGroups).map(
      (group: AccountGroupWithInternalAccounts) => group.id,
    ),
  );

  const [selectedCaipAccountIds, setSelectedCaipAccountIds] = useState<
    CaipAccountId[]
  >(suggestedCaipAccountIds ?? []);

  const sheetRef = useRef<BottomSheetRef>(null);
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

  useEffect(() => {
    const accountsAddressList = accountGroups.map(
      (accountGroup: AccountGroupWithInternalAccounts) => accountGroup.id,
    );

    if (previousIdentitiesListSize.current !== accountsAddressList.length) {
      setSelectedAccountGroupIds(
        connectedAccountGroups.map(
          (group: AccountGroupWithInternalAccounts) => group.id,
        ),
      );
      setSelectedCaipAccountIds(
        getCaip25AccountFromAccountGroupAndScope(
          connectedAccountGroups,
          selectedChainIds,
        ),
      );
      previousIdentitiesListSize.current = accountsAddressList.length;
    }
  }, [
    accountGroups,
    connectedAccountGroups,
    existingConnectedCaipAccountIds,
    selectedAccountGroupIds,
    selectedChainIds,
    supportedAccountGroups,
  ]);

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
    // need to ensure the
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
      /*
       * TODO: update request object to match PermissionsRequest type
       */
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
            account_type: 'multichain', //getAddressAccountType(activeAddress),
            source: eventSource,
            chain_id_list: selectedChainIds,
            referrer: request.metadata.origin,
            ...getApiAnalyticsProperties(isMultichainRequest),
          })
          .build(),
      );
      let labelOptions: ToastOptions['labelOptions'] = [];

      if (connectedAccountLength >= 1) {
        labelOptions = [{ label: `${strings('toast.permissions_updated')}` }];
      }

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
    selectedAccountGroupIds,
    triggerDappViewedEvent,
    trackEvent,
    createEventBuilder,
    accountsLength,
    eventSource,
    toastRef,
    faviconSource,
  ]);

  const handleCreateAccount = useCallback(async () => {
    // TODO: use account service when available
  }, []);

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

  const hideSheet = useCallback(
    (callback?: () => void) =>
      sheetRef?.current?.onCloseBottomSheet?.(callback),
    [sheetRef],
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
        case USER_INTENT.Import: {
          navigation.navigate('ImportPrivateKeyView');
          // TODO: Confirm if this is where we want to track importing an account or within ImportPrivateKeyView screen.
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
            ).build(),
          );
          break;
        }
        case USER_INTENT.ImportSrp: {
          navigation.navigate('ImportSrpView');
          break;
        }
        case USER_INTENT.ConnectHW: {
          navigation.navigate('ConnectQRHardwareFlow');
          // TODO: Confirm if this is where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen.
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.CONNECT_HARDWARE_WALLET,
            ).build(),
          );

          break;
        }
      }
    };

    handleUserActions(userIntent);

    setUserIntent(USER_INTENT.None);
  }, [
    navigation,
    userIntent,
    sheetRef,
    cancelPermissionRequest,
    permissionRequestId,
    handleCreateAccount,
    handleConfirm,
    hideSheet,
    trackEvent,
    createEventBuilder,
  ]);

  const renderPermissionsSummaryScreen = useCallback(() => {
    const permissionsSummaryProps: MultichainPermissionsSummaryProps = {
      currentPageInformation: {
        currentEnsName: '',
        icon: faviconSource as string,
        url: urlWithProtocol,
      },
      onEdit: () => {
        setScreen(AccountConnectScreens.MultiConnectSelector);
      },
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
      onCreateAccount: (_clientType, _scope) => {
        // TODO: Implement account creation when account provider is ready
      },
    };

    return <MultichainPermissionsSummary {...permissionsSummaryProps} />;
  }, [
    faviconSource,
    urlWithProtocol,
    handleConfirm,
    selectedAccountGroupIds,
    selectedNetworkAvatars,
    tabIndex,
    cancelPermissionRequest,
    permissionRequestId,
    navigation,
  ]);

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
