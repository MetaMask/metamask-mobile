// Third party dependencies.
import { useNavigation } from '@react-navigation/native';
import { isEqual } from 'lodash';
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
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
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
import UntypedEngine from '../../../core/Engine';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { selectIdentities } from '../../../selectors/preferencesController';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import Logger from '../../../util/Logger';
import getAccountNameWithENS from '../../../util/accounts';
import {
  getAddressAccountType,
  safeToChecksumAddress,
} from '../../../util/address';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { getActiveTabUrl } from '../../../util/transactions';
import { Account, useAccounts } from '../../hooks/useAccounts';

// Internal dependencies.
import { StyleSheet } from 'react-native';
import URLParse from 'url-parse';
import PhishingModal from '../../../components/UI/PhishingModal';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import {
  MM_BLOCKLIST_ISSUE_URL,
  MM_ETHERSCAN_URL,
  MM_PHISH_DETECT_URL,
} from '../../../constants/urls';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
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
import { SourceType } from '../../hooks/useMetrics/useMetrics.types';

const createStyles = () =>
  StyleSheet.create({
    fullScreenModal: {
      flex: 1,
    },
  });

const AccountConnect = (props: AccountConnectProps) => {
  const Engine = UntypedEngine as any;

  const { colors } = useTheme();
  const styles = createStyles();
  const { hostInfo, permissionRequestId } = props.route.params;
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { trackEvent } = useMetrics();

  const [blockedUrl, setBlockedUrl] = useState('');

  const selectedWalletAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([
    selectedWalletAddress,
  ]);
  const sheetRef = useRef<BottomSheetRef>(null);
  const [screen, setScreen] = useState<AccountConnectScreens>(
    AccountConnectScreens.SingleConnect,
  );
  const { accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
  const previousIdentitiesListSize = useRef<number>();
  const identitiesMap = useSelector(selectIdentities);
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [userIntent, setUserIntent] = useState(USER_INTENT.None);

  const { toastRef } = useContext(ToastContext);
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  // origin is set to the last active tab url in the browser which can conflict with sdk
  const inappBrowserOrigin: string = useSelector(getActiveTabUrl, isEqual);
  const accountsLength = useSelector(selectAccountsLength);

  // TODO: pending transaction controller update, we need to have a parameter that can be extracted from the metadata to know the correct source (inappbrowser, walletconnect, sdk)
  // on inappBrowser: hostname from inappBrowserOrigin
  // on walletConnect: hostname from hostInfo
  // on sdk: channelId
  const { origin: channelIdOrHostname } = hostInfo.metadata as {
    id: string;
    origin: string;
  };

  const sdkConnection = SDKConnect.getInstance().getConnection({
    channelId: channelIdOrHostname,
  });

  const hostname = channelIdOrHostname
    ? channelIdOrHostname.indexOf('.') !== -1
      ? channelIdOrHostname
      : sdkConnection?.originatorInfo?.url ?? ''
    : inappBrowserOrigin;

  const urlWithProtocol = hostname
    ? prefixUrlWithProtocol(hostname)
    : strings('sdk.unknown');

  const dappIconUrl = sdkConnection?.originatorInfo?.icon;
  const dappUrl = sdkConnection?.originatorInfo?.url ?? '';

  const isAllowedUrl = useCallback(
    (url: string) => {
      const { PhishingController } = Engine.context;

      // Update phishing configuration if it is out-of-date
      // This is async but we are not `await`-ing it here intentionally, so that we don't slow
      // down network requests. The configuration is updated for the next request.
      PhishingController.maybeUpdateState();

      const phishingControllerTestResult = PhishingController.test(url);

      return !phishingControllerTestResult.result;
    },
    [Engine.context],
  );

  useEffect(() => {
    const url = dappUrl || channelIdOrHostname || '';

    const cleanUrl = url.replace(/^https?:\/\//, '');

    const isAllowed = isAllowedUrl(cleanUrl);

    if (!isAllowed) {
      setBlockedUrl(dappUrl);
      setShowPhishingModal(true);
    }
  }, [isAllowedUrl, dappUrl, channelIdOrHostname]);

  const faviconSource = useFavicon(inappBrowserOrigin);

  const actualIcon = useMemo(
    () => (dappIconUrl ? { uri: dappIconUrl } : faviconSource),
    [dappIconUrl, faviconSource],
  );

  const secureIcon = useMemo(
    () =>
      (getUrlObj(hostname) as URLParse<string>).protocol === 'https:'
        ? IconName.Lock
        : IconName.LockSlash,
    [hostname],
  );

  const eventSource = useMemo(() => {
    // walletconnect channelId format: app.name.org
    // sdk channelId format: uuid
    // inappbrowser channelId format: app.name.org but origin is set
    if (channelIdOrHostname) {
      if (sdkConnection) {
        return SourceType.SDK;
      }
      return SourceType.WALLET_CONNECT;
    }

    return SourceType.IN_APP_BROWSER;
  }, [sdkConnection, channelIdOrHostname]);

  // Refreshes selected addresses based on the addition and removal of accounts.
  useEffect(() => {
    const identitiesAddressList = Object.keys(identitiesMap);
    if (previousIdentitiesListSize.current !== identitiesAddressList.length) {
      // Clean up selected addresses that are no longer part of identities.
      const updatedSelectedAddresses = selectedAddresses.filter((address) =>
        identitiesAddressList.includes(address),
      );
      setSelectedAddresses(updatedSelectedAddresses);
      previousIdentitiesListSize.current = identitiesAddressList.length;
    }
  }, [identitiesMap, selectedAddresses]);

  const cancelPermissionRequest = useCallback(
    (requestId) => {
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

      trackEvent(MetaMetricsEvents.CONNECT_REQUEST_CANCELLED, {
        number_of_accounts: accountsLength,
        source: SourceType.PERMISSION_SYSTEM,
      });
    },
    [
      Engine.context.PermissionController,
      accountsLength,
      channelIdOrHostname,
      trackEvent,
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
      trackDappViewedEvent({ hostname, numberOfConnectedAccounts }),
    [hostname],
  );

  const handleConnect = useCallback(async () => {
    const request = {
      ...hostInfo,
      metadata: {
        ...hostInfo.metadata,
        origin: channelIdOrHostname,
      },
      approvedAccounts: selectedAddresses,
    };

    const connectedAccountLength = selectedAddresses.length;
    const activeAddress = selectedAddresses[0];
    const activeAccountName = getAccountNameWithENS({
      accountAddress: activeAddress,
      accounts,
      ensByAccountAddress,
    });

    try {
      setIsLoading(true);
      await Engine.context.PermissionController.acceptPermissionsRequest(
        request,
      );

      triggerDappViewedEvent(connectedAccountLength);

      trackEvent(MetaMetricsEvents.CONNECT_REQUEST_COMPLETED, {
        number_of_accounts: accountsLength,
        number_of_accounts_connected: connectedAccountLength,
        account_type: getAddressAccountType(activeAddress),
        source: eventSource,
      });
      let labelOptions: ToastOptions['labelOptions'] = [];
      if (connectedAccountLength > 1) {
        labelOptions = [
          { label: `${connectedAccountLength} `, isBold: true },
          {
            label: `${strings('toast.accounts_connected')}`,
          },
          { label: `\n${activeAccountName} `, isBold: true },
          { label: strings('toast.now_active') },
        ];
      } else {
        labelOptions = [
          { label: `${activeAccountName} `, isBold: true },
          { label: strings('toast.connected_and_active') },
        ];
      }
      toastRef?.current?.showToast({
        variant: ToastVariants.Account,
        labelOptions,
        accountAddress: activeAddress,
        accountAvatarType,
      });
    } catch (e: any) {
      Logger.error(e, 'Error while trying to connect to a dApp.');
    } finally {
      setIsLoading(false);
    }
  }, [
    eventSource,
    selectedAddresses,
    hostInfo,
    accounts,
    ensByAccountAddress,
    accountAvatarType,
    Engine.context.PermissionController,
    toastRef,
    accountsLength,
    channelIdOrHostname,
    triggerDappViewedEvent,
    trackEvent,
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
        trackEvent(MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT);
      } catch (e: any) {
        Logger.error(e, 'error while trying to add a new account');
      } finally {
        setIsLoading(false);
      }
    },
    [Engine.context, trackEvent],
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
          trackEvent(MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT);
          break;
        }
        case USER_INTENT.ConnectHW: {
          navigation.navigate('ConnectQRHardwareFlow');
          // TODO: Confirm if this is where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen.
          trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET);

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
        selectedAddresses={selectedAddresses}
        onSelectAddress={setSelectedAddresses}
        isLoading={isLoading}
        favicon={faviconSource}
        secureIcon={secureIcon}
        urlWithProtocol={urlWithProtocol}
        onUserAction={setUserIntent}
        onBack={() => setScreen(AccountConnectScreens.SingleConnect)}
        connection={sdkConnection}
      />
    ),
    [
      accounts,
      ensByAccountAddress,
      selectedAddresses,
      setSelectedAddresses,
      isLoading,
      setUserIntent,
      faviconSource,
      urlWithProtocol,
      secureIcon,
      sdkConnection,
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
        return renderSingleConnectScreen();
      case AccountConnectScreens.SingleConnectSelector:
        return renderSingleConnectSelectorScreen();
      case AccountConnectScreens.MultiConnectSelector:
        return renderMultiConnectSelectorScreen();
    }
  }, [
    screen,
    renderSingleConnectScreen,
    renderSingleConnectSelectorScreen,
    renderMultiConnectSelectorScreen,
  ]);

  return (
    <BottomSheet onClose={handleSheetDismiss} ref={sheetRef}>
      {renderConnectScreens()}
      {renderPhishingModal()}
    </BottomSheet>
  );
};

export default AccountConnect;
