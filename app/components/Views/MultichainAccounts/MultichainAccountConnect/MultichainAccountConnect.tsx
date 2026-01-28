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
import {
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
  getSelectedMultichainNetwork,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../../selectors/networkController.ts';
import { isUUID } from '../../../../core/SDKConnect/utils/isUUID.ts';
import useOriginSource from '../../../hooks/useOriginSource.ts';
import {
  getCaip25PermissionsResponse,
  getRequestedCaip25CaveatValue,
  mergeCaip25Values,
} from '../../AccountConnect/utils.ts';
import {
  getPhishingTestResultAsync,
  isProductSafetyDappScanningEnabled,
} from '../../../../util/phishingDetection.ts';
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
  getCaipAccountIdsFromCaip25CaveatValue,
  KnownSessionProperties,
} from '@metamask/chain-agnostic-permission';
import { SolScope } from '@metamask/keyring-api';
import styleSheet from './MultichainAccountConnect.styles.ts';
import { useStyles } from '../../../../component-library/hooks/index.ts';
import { getApiAnalyticsProperties } from '../../../../util/metrics/MultichainAPI/getApiAnalyticsProperties.ts';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts.type.ts';
import { AccountGroupId } from '@metamask/account-api';
import MultichainPermissionsSummary, {
  MultichainPermissionsSummaryProps,
} from '../MultichainPermissionsSummary/MultichainPermissionsSummary.tsx';
import MultichainAccountConnectMultiSelector from './MultichainAccountConnectMultiSelector/MultichainAccountConnectMultiSelector.tsx';
import { getPermissions } from '../../../../selectors/snaps/index.ts';
import { useSDKV2Connection } from '../../../hooks/useSDKV2Connection';
import { useAccountGroupsForPermissions } from '../../../hooks/useAccountGroupsForPermissions/useAccountGroupsForPermissions.ts';
import NetworkConnectMultiSelector from '../../NetworkConnect/NetworkConnectMultiSelector/index.ts';
import { Box } from '@metamask/design-system-react-native';
import { TESTNET_CAIP_IDS } from '../../../../constants/network.js';
import { getCaip25AccountIdsFromAccountGroupAndScope } from '../../../../util/multichain/getCaip25AccountIdsFromAccountGroupAndScope.ts';

interface ScreenContainerProps {
  isVisible: boolean;
  children: React.ReactNode;
  styles: {
    screenVisible: object;
    screenHidden: object;
  };
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({
  isVisible,
  children,
  styles,
}) => (
  <Box
    style={isVisible ? styles.screenVisible : styles.screenHidden}
    pointerEvents={isVisible ? 'auto' : 'none'}
  >
    {children}
  </Box>
);

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
      existingPermissionsForHost
        ? getRequestedCaip25CaveatValue(
            existingPermissionsForHost,
            hostInfo?.metadata?.origin,
          )
        : {
            requiredScopes: {},
            optionalScopes: {},
            sessionProperties: {},
            isMultichainOrigin: false,
          },
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

  const requestedRequestWithExistingPermissions = useMemo(
    () =>
      mergeCaip25Values(
        existingPermissionsCaip25CaveatValue,
        requestedCaip25CaveatValue,
      ),
    [existingPermissionsCaip25CaveatValue, requestedCaip25CaveatValue],
  );

  const requestedCaipAccountIds = useMemo(
    () => getCaipAccountIdsFromCaip25CaveatValue(requestedCaip25CaveatValue),
    [requestedCaip25CaveatValue],
  );

  const requestedCaipChainIds = useMemo(
    () =>
      getAllScopesFromCaip25CaveatValue(requestedCaip25CaveatValue).filter(
        (chainId) => {
          const { namespace } = parseCaipChainId(chainId);
          return namespace !== KnownCaipNamespace.Wallet;
        },
      ),
    [requestedCaip25CaveatValue],
  );

  const requestedScopes = useMemo(
    () => getAllScopesFromCaip25CaveatValue(requestedCaip25CaveatValue),
    [requestedCaip25CaveatValue],
  );

  const isSolanaWalletStandardRequest =
    requestedScopes.length === 1 &&
    requestedScopes[0] === SolScope.Mainnet &&
    requestedCaip25CaveatValue.sessionProperties[
      KnownSessionProperties.SolanaAccountChangedNotifications
    ];

  const requestedNamespaces = useMemo(
    () => getAllNamespacesFromCaip25CaveatValue(requestedCaip25CaveatValue),
    [requestedCaip25CaveatValue],
  );

  const requestedNamespacesWithoutWallet = useMemo(
    () =>
      requestedNamespaces.filter(
        (namespace) => namespace !== KnownCaipNamespace.Wallet,
      ),
    [requestedNamespaces],
  );

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const [nonTestNetworkConfigurations, testNetworkConfigurations] = useMemo(
    () =>
      Object.entries(networkConfigurations).reduce(
        ([nonTestNetworksList, testNetworksList], [chainId, network]) => {
          const caipChainId = chainId as CaipChainId;
          const isTestNetwork = TESTNET_CAIP_IDS.includes(caipChainId);
          (isTestNetwork ? testNetworksList : nonTestNetworksList).push({
            ...network,
            caipChainId,
          });
          return [nonTestNetworksList, testNetworksList];
        },
        [
          [] as EvmAndMultichainNetworkConfigurationsWithCaipChainId[],
          [] as EvmAndMultichainNetworkConfigurationsWithCaipChainId[],
        ],
      ),
    [networkConfigurations],
  );

  const nonTestNetworkCaipChainIds = nonTestNetworkConfigurations.map(
    ({ caipChainId }) => caipChainId,
  );
  const testNetworkCaipChainIds = testNetworkConfigurations.map(
    ({ caipChainId }) => caipChainId,
  );

  const alreadyConnectedCaipChainIds = useMemo(
    () =>
      getAllScopesFromCaip25CaveatValue(existingPermissionsCaip25CaveatValue),
    [existingPermissionsCaip25CaveatValue],
  );

  const { wc2Metadata } = useSelector((state: RootState) => state.sdk);

  const { origin: channelIdOrHostname, isEip1193Request } = hostInfo.metadata;

  const sdkV2Connection = useSDKV2Connection(channelIdOrHostname);
  const isOriginMMSDKV2RemoteConn = useMemo(
    () => Boolean(sdkV2Connection?.isV2),
    [sdkV2Connection?.isV2],
  );

  const isChannelId = isUUID(channelIdOrHostname);

  const sdkConnection = SDKConnect.getInstance().getConnection({
    channelId: channelIdOrHostname,
  });

  const isOriginMMSDKRemoteConn = sdkConnection !== undefined;

  const isOriginWalletConnect =
    !isOriginMMSDKRemoteConn && wc2Metadata?.id && wc2Metadata?.id.length > 0;

  const currentlySelectedNetwork = useSelector(getSelectedMultichainNetwork);

  const requestedAndAlreadyConnectedCaipChainIdsOrDefault = useMemo(() => {
    const allNetworksList = [
      ...nonTestNetworkCaipChainIds,
      ...testNetworkCaipChainIds,
    ];

    // If globally selected network is a test network, include that in the default selected networks for connection request
    const currentlySelectedNetworkChainId = currentlySelectedNetwork.chainId;
    const selectedNetworkIsTestNetwork = testNetworkCaipChainIds.find(
      (network) => network === currentlySelectedNetworkChainId,
    );

    let defaultSelectedNetworkList = selectedNetworkIsTestNetwork
      ? [...nonTestNetworkCaipChainIds, selectedNetworkIsTestNetwork]
      : nonTestNetworkCaipChainIds;

    // Filter out Tron networks since they're not yet supported in mobile
    defaultSelectedNetworkList = defaultSelectedNetworkList.filter(
      (caipChainId) => {
        const { namespace } = parseCaipChainId(caipChainId);
        return namespace !== KnownCaipNamespace.Tron;
      },
    );

    // If the request is an EIP-1193 request (with no specific chains requested) or a Solana wallet standard request, return the default selected network list
    // Note: Tron Wallet Adapter requests are not handled here since Tron is not yet supported in mobile
    if (
      (requestedCaipChainIds.length === 0 && isEip1193Request) ||
      isSolanaWalletStandardRequest
    ) {
      return defaultSelectedNetworkList;
    }

    let additionalChains: CaipChainId[] = [];
    if (isEip1193Request) {
      additionalChains = nonTestNetworkCaipChainIds.filter((caipChainId) =>
        requestedNamespacesWithoutWallet.includes(
          parseCaipChainId(caipChainId).namespace,
        ),
      );
    }

    const supportedRequestedCaipChainIds = Array.from(
      new Set([
        ...requestedCaipChainIds.filter((requestedCaipChainId) =>
          allNetworksList.includes(requestedCaipChainId as CaipChainId),
        ),
        ...additionalChains,
      ]),
    );

    // if we have specifically requested chains, return the supported requested chains plus the already connected chains
    if (supportedRequestedCaipChainIds.length > 0) {
      return Array.from(
        new Set([
          ...supportedRequestedCaipChainIds,
          ...alreadyConnectedCaipChainIds,
        ]),
      );
    }

    if (requestedNamespaces.length > 0) {
      return Array.from(
        new Set(
          defaultSelectedNetworkList.filter((caipChainId) => {
            const { namespace } = parseCaipChainId(caipChainId);
            return requestedNamespaces.includes(namespace);
          }),
        ),
      );
    }

    return defaultSelectedNetworkList;
  }, [
    nonTestNetworkCaipChainIds,
    testNetworkCaipChainIds,
    requestedCaipChainIds,
    isEip1193Request,
    currentlySelectedNetwork.chainId,
    requestedNamespaces,
    requestedNamespacesWithoutWallet,
    alreadyConnectedCaipChainIds,
    isSolanaWalletStandardRequest,
  ]);

  const {
    connectedAccountGroups,
    supportedAccountGroups,
    connectedAccountGroupWithRequested,
    caipAccountIdsOfConnectedAndRequestedAccountGroups,
    selectedAndRequestedAccountGroups,
  } = useAccountGroupsForPermissions(
    existingPermissionsCaip25CaveatValue,
    requestedCaipAccountIds,
    requestedAndAlreadyConnectedCaipChainIdsOrDefault,
    requestedNamespacesWithoutWallet,
  );

  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>(
    requestedAndAlreadyConnectedCaipChainIdsOrDefault,
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
        suggestedAccountGroups: connectedAccountGroupWithRequested,
        suggestedCaipAccountIds:
          caipAccountIdsOfConnectedAndRequestedAccountGroups,
      };
    }

    if (supportedAccountGroups.length === 0) {
      return {
        suggestedAccountGroups: [],
        suggestedCaipAccountIds: [],
      };
    }

    if (requestedCaipAccountIds.length === 0) {
      const [defaultSelectedAccountGroup] = supportedAccountGroups;

      return {
        suggestedAccountGroups: [defaultSelectedAccountGroup],
        suggestedCaipAccountIds: getCaip25AccountIdsFromAccountGroupAndScope(
          [defaultSelectedAccountGroup],
          requestedAndAlreadyConnectedCaipChainIdsOrDefault,
        ),
      };
    }

    return {
      suggestedAccountGroups: selectedAndRequestedAccountGroups,
      suggestedCaipAccountIds: getCaip25AccountIdsFromAccountGroupAndScope(
        selectedAndRequestedAccountGroups,
        requestedAndAlreadyConnectedCaipChainIdsOrDefault,
      ),
    };
  }, [
    connectedAccountGroups.length,
    supportedAccountGroups,
    requestedCaipAccountIds.length,
    selectedAndRequestedAccountGroups,
    requestedAndAlreadyConnectedCaipChainIdsOrDefault,
    connectedAccountGroupWithRequested,
    caipAccountIdsOfConnectedAndRequestedAccountGroups,
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

  const dappUrl =
    sdkConnection?.originatorInfo?.url ??
    sdkV2Connection?.originatorInfo?.url ??
    '';

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
    } else if (isOriginMMSDKV2RemoteConn) {
      title = sdkV2Connection?.origin;
      dappHostname = sdkV2Connection?.originatorInfo?.title ?? '';
    }
    return { domainTitle: title, hostname: dappHostname };
  }, [
    isOriginWalletConnect,
    isOriginMMSDKRemoteConn,
    isOriginMMSDKV2RemoteConn,
    sdkV2Connection,
    isChannelId,
    dappUrl,
    channelIdOrHostname,
    wc2Metadata?.lastVerifiedUrl,
    wc2Metadata?.url,
  ]);

  const urlWithProtocol =
    hostname && !isUUID(hostname) && !isOriginMMSDKV2RemoteConn
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

  const { faviconURI: faviconSource } = useFavicon(dappUrl);

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
          requestedRequestWithExistingPermissions,
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
        variant: ToastVariants.App,
        labelOptions,
        appIconSource: faviconSource,
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
    requestedRequestWithExistingPermissions,
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

      const caip25AccountIds = getCaip25AccountIdsFromAccountGroupAndScope(
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
        backdropColor={colors.background.alternative}
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
      colors.background.alternative,
      continueToPhishingSite,
      goBackToSafety,
      goToETHPhishingDetector,
      goToEtherscam,
      goToFilePhishingIssue,
      showPhishingModal,
    ],
  );

  return (
    <Box style={styles.container}>
      <ScreenContainer
        isVisible={screen === AccountConnectScreens.SingleConnect}
        styles={styles}
      >
        {renderPermissionsSummaryScreen()}
      </ScreenContainer>
      <ScreenContainer
        isVisible={screen === AccountConnectScreens.MultiConnectSelector}
        styles={styles}
      >
        {renderMultiConnectSelectorScreen()}
      </ScreenContainer>
      <ScreenContainer
        isVisible={screen === AccountConnectScreens.MultiConnectNetworkSelector}
        styles={styles}
      >
        {renderMultiConnectNetworkSelectorScreen()}
      </ScreenContainer>
      {renderPhishingModal()}
    </Box>
  );
};

export default MultichainAccountConnect;
