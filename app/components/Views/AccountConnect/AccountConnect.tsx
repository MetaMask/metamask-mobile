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

// External dependencies.
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { ToastOptions } from '../../../component-library/components/Toast/Toast.types';
import { USER_INTENT } from '../../../constants/permissions';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import {
  InternalAccountWithCaipAccountId,
  selectInternalAccountsWithCaipAccountId,
} from '../../../selectors/accountsController';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import Logger from '../../../util/Logger';
import {
  getAddressAccountType,
  safeToChecksumAddress,
} from '../../../util/address';
import {
  getHost,
  getUrlObj,
  prefixUrlWithProtocol,
} from '../../../util/browser';
import { Account, useAccounts } from '../../hooks/useAccounts';

// Internal dependencies.
import { PermissionsRequest } from '@metamask/permission-controller';
import { ImageURISource } from 'react-native';
import PhishingModal from '../../../components/UI/PhishingModal';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import {
  MM_BLOCKLIST_ISSUE_URL,
  MM_ETHERSCAN_URL,
  MM_PHISH_DETECT_URL,
} from '../../../constants/urls';
import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
import { RootState } from '../../../reducers';
import { trackDappViewedEvent } from '../../../util/metrics';
import { useTheme } from '../../../util/theme';
import useFavicon from '../../hooks/useFavicon/useFavicon';
import {
  AccountConnectProps,
  AccountConnectScreens,
  NetworkAvatarProps,
} from './AccountConnect.types';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';
import AccountConnectSingle from './AccountConnectSingle';
import AccountConnectSingleSelector from './AccountConnectSingleSelector';
import { PermissionsSummaryProps } from '../../../components/UI/PermissionsSummary/PermissionsSummary.types';
import PermissionsSummary from '../../../components/UI/PermissionsSummary';
import { getNetworkImageSource } from '../../../util/networks';
import NetworkConnectMultiSelector from '../NetworkConnect/NetworkConnectMultiSelector';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { selectNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import { isUUID } from '../../../core/SDKConnect/utils/isUUID';
import useOriginSource from '../../hooks/useOriginSource';
import {
  getCaip25PermissionsResponse,
  getDefaultAccounts,
  getRequestedCaip25CaveatValue,
} from './utils';
import {
  getPhishingTestResultAsync,
  isProductSafetyDappScanningEnabled,
} from '../../../util/phishingDetection';
import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import {
  getAllNamespacesFromCaip25CaveatValue,
  getAllScopesFromCaip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
  isCaipAccountIdInPermittedAccountIds,
} from '@metamask/chain-agnostic-permission';
import { isEqualCaseInsensitive } from '@metamask/controller-utils';
import styleSheet from './AccountConnect.styles';
import { useStyles } from '../../../component-library/hooks';

const AccountConnect = (props: AccountConnectProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { hostInfo, permissionRequestId } = props.route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const { accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });

  const previousIdentitiesListSize = useRef<number>();
  const internalAccounts = useSelector(selectInternalAccountsWithCaipAccountId);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [blockedUrl, setBlockedUrl] = useState('');

  const [selectedNetworkAvatars, setSelectedNetworkAvatars] = useState<
    NetworkAvatarProps[]
  >([]);

  const requestedCaip25CaveatValue = useMemo(
    () => getRequestedCaip25CaveatValue(hostInfo.permissions),
    [hostInfo.permissions],
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
  const allNetworksList = Object.keys(networkConfigurations) as CaipChainId[];

  const supportedRequestedCaipChainIds = requestedCaipChainIds.filter(
    (caipChainId) => allNetworksList.includes(caipChainId as CaipChainId),
  );

  const defaultSelectedChainIds =
    supportedRequestedCaipChainIds.length > 0
      ? supportedRequestedCaipChainIds
      : allNetworksList;

  const [selectedChainIds, _setSelectedChainIds] = useState<CaipChainId[]>(
    defaultSelectedChainIds as CaipChainId[],
  );
  const setSelectedChainIds = useCallback(
    (newSelectedChainIds: CaipChainId[]) => {
      _setSelectedChainIds(newSelectedChainIds);

      const newNetworkAvatars = newSelectedChainIds.map(
        (newSelectedChainId) => ({
          size: AvatarSize.Xs,
          name: networkConfigurations[newSelectedChainId]?.name || '',
          imageSource: getNetworkImageSource({ chainId: newSelectedChainId }),
          variant: AvatarVariant.Network,
        }),
      );
      setSelectedNetworkAvatars(newNetworkAvatars);
    },
    [networkConfigurations, setSelectedNetworkAvatars],
  );

  // all accounts that match the requested namespaces
  const supportedAccountsForRequestedNamespaces = internalAccounts.filter(
    (account) => {
      const {
        chain: { namespace },
      } = parseCaipAccountId(account.caipAccountId);
      return requestedNamespaces.includes(namespace);
    },
  );

  const supportedRequestedAccounts = requestedCaipAccountIds.reduce(
    (acc, account) => {
      const supportedRequestedAccount =
        supportedAccountsForRequestedNamespaces.find(({ caipAccountId }) => {
          const {
            chain: { namespace },
          } = parseCaipAccountId(caipAccountId);
          // EIP155 (EVM) addresses are not case sensitive
          if (namespace === KnownCaipNamespace.Eip155) {
            return isEqualCaseInsensitive(caipAccountId, account);
          }
          return caipAccountId === account;
        });
      if (supportedRequestedAccount) {
        acc.push(supportedRequestedAccount);
      }
      return acc;
    },
    [] as InternalAccountWithCaipAccountId[],
  );

  const defaultAccounts = getDefaultAccounts(
    requestedNamespaces,
    supportedRequestedAccounts,
    supportedAccountsForRequestedNamespaces,
  );

  const defaultCaipAccountAddresses = defaultAccounts.map(
    ({ caipAccountId }) => caipAccountId,
  );

  const [selectedAddresses, setSelectedAddresses] = useState<CaipAccountId[]>(
    defaultCaipAccountAddresses,
  );

  const sheetRef = useRef<BottomSheetRef>(null);
  const [screen, setScreen] = useState<AccountConnectScreens>(
    AccountConnectScreens.SingleConnect,
  );
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [userIntent, setUserIntent] = useState(USER_INTENT.None);
  const isMountedRef = useRef(true);

  const { toastRef } = useContext(ToastContext);

  const accountsLength = useSelector(selectAccountsLength);
  const { wc2Metadata } = useSelector((state: RootState) => state.sdk);

  const { origin: channelIdOrHostname } = hostInfo.metadata as {
    id: string;
    origin: string;
  };

  const isChannelId = isUUID(channelIdOrHostname);

  const sdkConnection = SDKConnect.getInstance().getConnection({
    channelId: channelIdOrHostname,
  });

  const isOriginMMSDKRemoteConn = sdkConnection !== undefined;

  const isOriginWalletConnect =
    !isOriginMMSDKRemoteConn && wc2Metadata?.id && wc2Metadata?.id.length > 0;

  const dappIconUrl = sdkConnection?.originatorInfo?.icon;
  const dappUrl = sdkConnection?.originatorInfo?.url ?? '';

  const [isSdkUrlUnknown, setIsSdkUrlUnknown] = useState(false);

  const { domainTitle, hostname } = useMemo(() => {
    let title = '';
    let dappHostname = dappUrl || channelIdOrHostname;

    if (
      isOriginMMSDKRemoteConn &&
      channelIdOrHostname.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)
    ) {
      title = getUrlObj(
        channelIdOrHostname.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1],
      ).origin;
    } else if (isOriginWalletConnect) {
      title = channelIdOrHostname;
      dappHostname = title;
    } else if (!isChannelId && (dappUrl || channelIdOrHostname)) {
      title = prefixUrlWithProtocol(dappUrl || channelIdOrHostname);
      dappHostname = channelIdOrHostname;
    } else {
      title = strings('sdk.unknown');
      setIsSdkUrlUnknown(true);
    }

    return { domainTitle: title, hostname: dappHostname };
  }, [
    isOriginWalletConnect,
    isOriginMMSDKRemoteConn,
    isChannelId,
    dappUrl,
    channelIdOrHostname,
  ]);

  const urlWithProtocol =
    hostname && !isUUID(hostname)
      ? prefixUrlWithProtocol(getHost(hostname))
      : domainTitle;

  const { hostname: hostnameFromUrlObj, protocol: protocolFromUrlObj } =
    getUrlObj(urlWithProtocol);

  useEffect(() => {
    // Create network avatars for all enabled networks
    const networkAvatars = Object.values(networkConfigurations).map(
      (network) => ({
        size: AvatarSize.Xs,
        name: network.name || '',
        imageSource: getNetworkImageSource({ chainId: network.caipChainId }),
        variant: AvatarVariant.Network,
      }),
    );

    setSelectedNetworkAvatars(networkAvatars);

    // No need to update selectedChainIds here since it's already initialized with all networks
  }, [networkConfigurations]);

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

  const actualIcon = useMemo(() => {
    // Priority to dappIconUrl
    if (dappIconUrl) {
      return { uri: dappIconUrl };
    }

    if (isOriginWalletConnect) {
      // fetch icon from store
      return { uri: wc2Metadata?.icon ?? '' };
    }

    const favicon = faviconSource as ImageURISource;
    if ('uri' in favicon) {
      return faviconSource;
    }

    return { uri: '' };
  }, [dappIconUrl, wc2Metadata, faviconSource, isOriginWalletConnect]);

  const secureIcon = useMemo(
    () =>
      protocolFromUrlObj === 'https:' ? IconName.Lock : IconName.LockSlash,
    [protocolFromUrlObj],
  );

  const eventSource = useOriginSource({ origin: channelIdOrHostname });

  // Refreshes selected addresses based on the addition and removal of accounts.
  useEffect(() => {
    // Extract the address list from the internalAccounts array
    const accountsAddressList = internalAccounts.map(
      (account) => account.caipAccountId,
    );

    if (previousIdentitiesListSize.current !== accountsAddressList.length) {
      // Clean up selected addresses that are no longer part of accounts.
      const updatedSelectedAddresses = selectedAddresses.filter((address) =>
        isCaipAccountIdInPermittedAccountIds(address, accountsAddressList),
      );

      setSelectedAddresses(updatedSelectedAddresses);
      previousIdentitiesListSize.current = accountsAddressList.length;
    }
  }, [internalAccounts, selectedAddresses]);

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

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_REQUEST_CANCELLED)
          .addProperties({
            number_of_accounts: accountsLength,
            source: eventSource,
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
          selectedAddresses,
          selectedChainIds,
        ),
      },
    };
    const connectedAccountLength = selectedAddresses.length;
    const activeAddress = selectedAddresses[0];

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
            account_type: getAddressAccountType(activeAddress),
            source: eventSource,
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
    eventSource,
    selectedAddresses,
    hostInfo,
    toastRef,
    accountsLength,
    channelIdOrHostname,
    triggerDappViewedEvent,
    trackEvent,
    faviconSource,
    createEventBuilder,
    selectedChainIds,
    requestedCaip25CaveatValue,
  ]);

  // This only handles EVM
  const handleCreateAccount = useCallback(
    async (isMultiSelect?: boolean) => {
      const { KeyringController } = Engine.context;
      try {
        setIsLoading(true);
        const addedAccountAddress = await KeyringController.addNewAccount();
        const checksummedAddress = safeToChecksumAddress(
          addedAccountAddress,
        ) as string;
        !isMultiSelect &&
          setSelectedAddresses([`eip155:0:${checksummedAddress}`]);
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
          ).build(),
        );
      } catch (e) {
        if (e instanceof Error) {
          Logger.error(e, 'error while trying to add a new account');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [trackEvent, createEventBuilder],
  );

  const handleAccountsSelected = useCallback(
    (newSelectedAccountAddresses: CaipAccountId[]) => {
      let updatedSelectedChains = [...selectedChainIds];

      newSelectedAccountAddresses.forEach((caipAccountAddress) => {
        const {
          chain: { namespace: accountNamespace },
        } = parseCaipAccountId(caipAccountAddress);

        const existsSelectedChainForNamespace = updatedSelectedChains.some(
          (caipChainId) => {
            try {
              const { namespace: chainNamespace } =
                parseCaipChainId(caipChainId);
              return accountNamespace === chainNamespace;
            } catch (err) {
              return false;
            }
          },
        );

        if (!existsSelectedChainForNamespace) {
          const chainIdsForNamespace = allNetworksList.filter((caipChainId) => {
            try {
              const { namespace: chainNamespace } =
                parseCaipChainId(caipChainId);
              return accountNamespace === chainNamespace;
            } catch (err) {
              return false;
            }
          });

          updatedSelectedChains = [
            ...updatedSelectedChains,
            ...chainIdsForNamespace,
          ];
        }
      });

      setSelectedChainIds(updatedSelectedChains);
      setSelectedAddresses(newSelectedAccountAddresses);
      setScreen(AccountConnectScreens.SingleConnect);
    },
    [
      setSelectedAddresses,
      setScreen,
      selectedChainIds,
      allNetworksList,
      setSelectedChainIds,
    ],
  );

  const handleNetworksSelected = useCallback(
    (newSelectedChainIds: CaipChainId[]) => {
      setSelectedChainIds(newSelectedChainIds);
      setScreen(AccountConnectScreens.SingleConnect);
    },
    [setScreen, setSelectedChainIds],
  );

  const hideSheet = (callback?: () => void) =>
    sheetRef?.current?.onCloseBottomSheet?.(callback);

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
          handleConnect();
          hideSheet();
          break;
        }
        case USER_INTENT.Create: {
          handleCreateAccount();
          break;
        }
        case USER_INTENT.CreateMultiple: {
          handleCreateAccount(true);
          break;
        }
        case USER_INTENT.Cancel: {
          hideSheet(() => cancelPermissionRequest(permissionRequestId));
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
    handleConnect,
    trackEvent,
    createEventBuilder,
  ]);

  const handleSheetDismiss = () => {
    if (!permissionRequestId || userIntent !== USER_INTENT.None) return;

    cancelPermissionRequest(permissionRequestId);
  };

  const renderSingleConnectScreen = useCallback(() => {
    const selectedAddress = selectedAddresses[0];
    const selectedAccount = accounts.find(
      (account) => account.caipAccountId === selectedAddress,
    );
    const { address } = parseCaipAccountId(selectedAddress);
    const ensName = ensByAccountAddress[address];
    const defaultSelectedAccount: Account | undefined = selectedAccount
      ? {
          ...selectedAccount,
          name:
            isDefaultAccountName(selectedAccount.name) && ensName
              ? ensName
              : selectedAccount.name,
        }
      : undefined;
    return (
      <AccountConnectSingle
        onSetSelectedAddresses={handleAccountsSelected}
        connection={sdkConnection}
        onSetScreen={setScreen}
        onUserAction={setUserIntent}
        defaultSelectedAccount={defaultSelectedAccount}
        isLoading={isLoading}
        favicon={actualIcon}
        secureIcon={secureIcon}
        urlWithProtocol={urlWithProtocol}
      />
    );
  }, [
    accounts,
    ensByAccountAddress,
    selectedAddresses,
    isLoading,
    setScreen,
    actualIcon,
    secureIcon,
    sdkConnection,
    urlWithProtocol,
    setUserIntent,
    handleAccountsSelected,
  ]);

  const renderPermissionsSummaryScreen = useCallback(() => {
    const permissionsSummaryProps: PermissionsSummaryProps = {
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
      onUserAction: setUserIntent,
      isAlreadyConnected: false,
      accountAddresses: selectedAddresses,
      ensByAccountAddress,
      accounts,
      networkAvatars: selectedNetworkAvatars,
      setTabIndex,
      tabIndex,
    };
    return <PermissionsSummary {...permissionsSummaryProps} />;
  }, [
    faviconSource,
    urlWithProtocol,
    selectedAddresses,
    selectedNetworkAvatars,
    accounts,
    ensByAccountAddress,
    tabIndex,
    setTabIndex,
  ]);

  const renderSingleConnectSelectorScreen = useCallback(
    () => (
      <AccountConnectSingleSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        onSetScreen={setScreen}
        onSetSelectedAddresses={handleAccountsSelected}
        selectedAddresses={selectedAddresses}
        isLoading={isLoading}
        onUserAction={setUserIntent}
      />
    ),
    [
      accounts,
      ensByAccountAddress,
      selectedAddresses,
      isLoading,
      setUserIntent,
      setScreen,
      handleAccountsSelected,
    ],
  );

  const renderMultiConnectSelectorScreen = useCallback(
    () => (
      <AccountConnectMultiSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        defaultSelectedAddresses={selectedAddresses}
        onSubmit={handleAccountsSelected}
        isLoading={isLoading}
        onBack={() => {
          setScreen(AccountConnectScreens.SingleConnect);
        }}
        connection={sdkConnection}
        hostname={hostnameFromUrlObj}
        screenTitle={strings('accounts.edit_accounts_title')}
      />
    ),
    [
      accounts,
      ensByAccountAddress,
      isLoading,
      sdkConnection,
      hostnameFromUrlObj,
      handleAccountsSelected,
      selectedAddresses,
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
        style={styles.fullScreenModal}
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
      styles.fullScreenModal,
    ],
  );

  const renderConnectScreens = useCallback(() => {
    switch (screen) {
      case AccountConnectScreens.SingleConnect:
        return isSdkUrlUnknown
          ? renderSingleConnectScreen()
          : renderPermissionsSummaryScreen();
      case AccountConnectScreens.SingleConnectSelector:
        return renderSingleConnectSelectorScreen();
      case AccountConnectScreens.MultiConnectSelector:
        return renderMultiConnectSelectorScreen();
      case AccountConnectScreens.MultiConnectNetworkSelector:
        return renderMultiConnectNetworkSelectorScreen();
    }
  }, [
    screen,
    isSdkUrlUnknown,
    renderSingleConnectScreen,
    renderPermissionsSummaryScreen,
    renderSingleConnectSelectorScreen,
    renderMultiConnectSelectorScreen,
    renderMultiConnectNetworkSelectorScreen,
  ]);

  return (
    <BottomSheet
      style={
        screen === AccountConnectScreens.SingleConnect &&
        styles.bottomSheetBackground
      }
      onClose={handleSheetDismiss}
      ref={sheetRef}
    >
      {renderConnectScreens()}
      {renderPhishingModal()}
    </BottomSheet>
  );
};

export default AccountConnect;
