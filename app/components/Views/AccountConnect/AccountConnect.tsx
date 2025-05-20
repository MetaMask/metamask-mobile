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
  selectInternalAccounts,
  selectPreviouslySelectedEvmAccount,
  selectSelectedInternalAccountFormattedAddress,
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
import { ImageURISource, ImageSourcePropType, StyleSheet } from 'react-native';
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
} from './AccountConnect.types';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';
import AccountConnectSingle from './AccountConnectSingle';
import AccountConnectSingleSelector from './AccountConnectSingleSelector';
import { PermissionsSummaryProps } from '../../../components/UI/PermissionsSummary/PermissionsSummary.types';
import PermissionsSummary from '../../../components/UI/PermissionsSummary';
import { getNetworkImageSource } from '../../../util/networks';
import NetworkConnectMultiSelector from '../NetworkConnect/NetworkConnectMultiSelector';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { isUUID } from '../../../core/SDKConnect/utils/isUUID';
import useOriginSource from '../../hooks/useOriginSource';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import {
  getCaip25PermissionsResponse,
  getRequestedCaip25CaveatValue,
} from './utils';
import { getFormattedAddressFromInternalAccount } from '../../../core/Multichain/utils';
import {
  getPhishingTestResultAsync,
  isProductSafetyDappScanningEnabled,
} from '../../../util/phishingDetection';
import { toHex } from '@metamask/controller-utils';

const createStyles = () =>
  StyleSheet.create({
    fullScreenModal: {
      flex: 1,
    },
  });

const AccountConnect = (props: AccountConnectProps) => {
  const { colors } = useTheme();
  const styles = createStyles();
  const { hostInfo, permissionRequestId } = props.route.params;
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [blockedUrl, setBlockedUrl] = useState('');

  const selectedWalletAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const previouslySelectedEvmAccount = useSelector(
    selectPreviouslySelectedEvmAccount,
  );

  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>(
    selectedWalletAddress && isEvmSelected
      ? [selectedWalletAddress]
      : [
          previouslySelectedEvmAccount
            ? getFormattedAddressFromInternalAccount(
                previouslySelectedEvmAccount,
              )
            : '',
        ],
  );

  const sheetRef = useRef<BottomSheetRef>(null);
  const [screen, setScreen] = useState<AccountConnectScreens>(
    AccountConnectScreens.SingleConnect,
  );
  const { evmAccounts: accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
  const previousIdentitiesListSize = useRef<number>();
  const internalAccounts = useSelector(selectInternalAccounts);
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [userIntent, setUserIntent] = useState(USER_INTENT.None);
  const isMountedRef = useRef(true);

  const [selectedNetworkAvatars, setSelectedNetworkAvatars] = useState<
    {
      size: AvatarSize;
      name: string;
      imageSource: ImageSourcePropType;
    }[]
  >([]);

  const { toastRef } = useContext(ToastContext);

  const accountsLength = useSelector(selectAccountsLength);
  const { wc2Metadata } = useSelector((state: RootState) => state.sdk);

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

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

  const { chainId } = useNetworkInfo(urlWithProtocol);

  const {
    hostname: hostnameFromUrlObj,
    protocol: protocolFromUrlObj
  } = getUrlObj(urlWithProtocol);

  const [selectedChainIds, setSelectedChainIds] = useState<string[]>(() => {
    // Get all enabled network chain IDs from networkConfigurations
    const enabledChainIds = Object.values(networkConfigurations).map(
      (network) => network.chainId,
    );
    return enabledChainIds;
  });

  useEffect(() => {
    // Create network avatars for all enabled networks
    const networkAvatars = Object.values(networkConfigurations).map(
      (network) => ({
        size: AvatarSize.Xs,
        name: network.name || '',
        imageSource: getNetworkImageSource({ chainId: network.chainId }),
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
      protocolFromUrlObj === 'https:'
        ? IconName.Lock
        : IconName.LockSlash,
    [protocolFromUrlObj],
  );

  const eventSource = useOriginSource({ origin: channelIdOrHostname });

  // Refreshes selected addresses based on the addition and removal of accounts.
  useEffect(() => {
    // Extract the address list from the internalAccounts array
    const accountsAddressList = internalAccounts.map((account) =>
      account.address.toLowerCase(),
    );

    if (previousIdentitiesListSize.current !== accountsAddressList.length) {
      // Clean up selected addresses that are no longer part of accounts.
      const updatedSelectedAddresses = selectedAddresses.filter((address) =>
        accountsAddressList.includes(address.toLowerCase()),
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
      trackDappViewedEvent({ hostname: hostnameFromUrlObj, numberOfConnectedAccounts }),
    [hostnameFromUrlObj],
  );

  const handleConnect = useCallback(async () => {
    const requestedCaip25CaveatValue = getRequestedCaip25CaveatValue(
      hostInfo.permissions,
    );

    /**
     * TODO: This should be removed as part of later UI connection refactor work for Multichain API implementation.
     * This logic should be removed and the UI should ensure it cannot continue if no chains are selected.
     * {@link https://github.com/MetaMask/metamask-mobile/pull/13970/files#r2042345624}
     */
    const chainsToPermit = chainId && selectedChainIds.length === 0 ? [chainId] : selectedChainIds;
    const hexSelectedAddresses = selectedAddresses.map((account) =>
      toHex(account),
    );
    const hexChainsToPermit = chainsToPermit.map((chain) => toHex(chain));

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
          hexSelectedAddresses,
          hexChainsToPermit,
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
    chainId,
  ]);

  const handleCreateAccount = useCallback(
    async (isMultiSelect?: boolean) => {
      const { KeyringController } = Engine.context;
      try {
        setIsLoading(true);
        const addedAccountAddress = await KeyringController.addNewAccount();
        const checksummedAddress = safeToChecksumAddress(
          addedAccountAddress,
        ) as string;
        !isMultiSelect && setSelectedAddresses([checksummedAddress]);
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
    (newSelectedAccountAddresses: string[]) => {
      setSelectedAddresses(newSelectedAccountAddresses);
      setScreen(AccountConnectScreens.SingleConnect);
    },
    [setSelectedAddresses, setScreen],
  );

  const handleNetworksSelected = useCallback(
    (newSelectedChainIds: string[]) => {
      setSelectedChainIds(newSelectedChainIds);

      const newNetworkAvatars = newSelectedChainIds.map(
        (newSelectedChainId) => ({
          size: AvatarSize.Xs,
          // @ts-expect-error - networkConfigurations is not typed
          name: networkConfigurations[newSelectedChainId]?.name || '',
          imageSource: getNetworkImageSource({ chainId: newSelectedChainId }),
        }),
      );
      setSelectedNetworkAvatars(newNetworkAvatars);
      setScreen(AccountConnectScreens.SingleConnect);
    },
    [networkConfigurations, setScreen],
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
      (account) =>
        safeToChecksumAddress(account.address) ===
        safeToChecksumAddress(selectedAddress),
    );
    const ensName = ensByAccountAddress[selectedAddress];
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
        onSetSelectedAddresses={setSelectedAddresses}
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
    setSelectedAddresses,
    actualIcon,
    secureIcon,
    sdkConnection,
    urlWithProtocol,
    setUserIntent,
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
      accounts,
      // @ts-expect-error imageSource not yet typed
      networkAvatars: selectedNetworkAvatars,
    };
    return <PermissionsSummary {...permissionsSummaryProps} />;
  }, [
    faviconSource,
    urlWithProtocol,
    selectedAddresses,
    selectedNetworkAvatars,
    accounts,
  ]);

  const renderSingleConnectSelectorScreen = useCallback(
    () => (
      <AccountConnectSingleSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        onSetScreen={setScreen}
        onSetSelectedAddresses={setSelectedAddresses}
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
      setSelectedAddresses,
      setScreen,
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
      selectedAddresses,
      isLoading,
      sdkConnection,
      hostnameFromUrlObj,
      handleAccountsSelected
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
    [
      isLoading,
      handleNetworksSelected,
      hostnameFromUrlObj,
      selectedChainIds,
    ],
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
    <BottomSheet onClose={handleSheetDismiss} ref={sheetRef}>
      {renderConnectScreens()}
      {renderPhishingModal()}
    </BottomSheet>
  );
};

export default AccountConnect;
