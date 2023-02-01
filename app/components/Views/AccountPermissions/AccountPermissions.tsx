// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { ImageSourcePropType } from 'react-native';
import { isEqual } from 'lodash';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import UntypedEngine from '../../../core/Engine';
import {
  addPermittedAccounts,
  getPermittedAccountsByHostname,
} from '../../../core/Permissions';
import AccountConnectMultiSelector from '../AccountConnect/AccountConnectMultiSelector';
import Logger from '../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { ToastOptions } from '../../../component-library/components/Toast/Toast.types';
import AnalyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAccounts, Account } from '../../hooks/useAccounts';
import getAccountNameWithENS from '../../../util/accounts';
import { IconName } from '../../../component-library/components/Icon';
import { getUrlObj } from '../../../util/browser';
import { getActiveTabUrl } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';

// Internal dependencies.
import {
  AccountPermissionsProps,
  AccountPermissionsScreens,
} from './AccountPermissions.types';
import AccountPermissionsConnected from './AccountPermissionsConnected';
import AccountPermissionsRevoke from './AccountPermissionsRevoke';
import USER_INTENT from '../../../constants/permissions';

const AccountPermissions = (props: AccountPermissionsProps) => {
  const navigation = useNavigation();
  const Engine = UntypedEngine as any;
  const {
    hostInfo: {
      metadata: { origin: hostname },
    },
  } = props.route.params;
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const accountsLength = useSelector(
    (state: any) =>
      Object.keys(
        state.engine.backgroundState.AccountTrackerController.accounts || {},
      ).length,
  );

  const nonTestnetNetworks = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList
        .length + 1,
  );

  const origin: string = useSelector(getActiveTabUrl, isEqual);
  // TODO - Once we can pass metadata to permission system, pass origin instead of hostname into this component.
  // const hostname = useMemo(() => new URL(origin).hostname, [origin]);
  const secureIcon = useMemo(
    () =>
      (getUrlObj(origin) as URL).protocol === 'https:'
        ? IconName.LockFilled
        : IconName.LockSlashFilled,
    [origin],
  );
  /**
   * Get image url from favicon api.
   */
  const favicon: ImageSourcePropType = useMemo(() => {
    const iconUrl = `https://api.faviconkit.com/${hostname}/50`;
    return { uri: iconUrl };
  }, [hostname]);

  const { toastRef } = useContext(ToastContext);
  const [isLoading, setIsLoading] = useState(false);
  const permittedAccountsList = useSelector(
    (state: any) => state.engine.backgroundState.PermissionController,
  );
  const permittedAccountsByHostname = getPermittedAccountsByHostname(
    permittedAccountsList,
    hostname,
  );
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const sheetRef = useRef<SheetBottomRef>(null);
  const [permissionsScreen, setPermissionsScreen] =
    useState<AccountPermissionsScreens>(AccountPermissionsScreens.Connected);
  const { accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
  const previousPermittedAccounts = useRef<string[]>();
  const previousIdentitiesListSize = useRef<number>();
  const identitiesMap = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );
  const activeAddress: string = permittedAccountsByHostname[0];

  const [userIntent, setUserIntent] = useState(USER_INTENT.None);

  const hideSheet = useCallback(
    (callback?: () => void) => sheetRef?.current?.hide?.(callback),
    [sheetRef],
  );
  const metricsSource = 'Browser Tab/Permission UI';

  // Checks if anymore accounts are connected to the dapp. Auto dismiss sheet if none are connected.
  useEffect(() => {
    if (
      previousPermittedAccounts.current === undefined &&
      permittedAccountsByHostname.length === 0
    ) {
      // TODO - Figure out better UX instead of auto dismissing. However, we cannot be in this state as long as accounts are not connected.
      hideSheet();
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [{ label: strings('toast.revoked_all') }],
      });
      previousPermittedAccounts.current = permittedAccountsByHostname.length;
    }
  }, [permittedAccountsByHostname, hideSheet, toastRef]);

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

  const accountsFilteredByPermissions = useMemo(() => {
    const accountsByPermittedStatus: Record<
      'permitted' | 'unpermitted',
      Account[]
    > = {
      permitted: [],
      unpermitted: [],
    };

    accounts.forEach((account) => {
      if (permittedAccountsByHostname.includes(account.address)) {
        accountsByPermittedStatus.permitted.push(account);
      } else {
        accountsByPermittedStatus.unpermitted.push(account);
      }
    });

    return accountsByPermittedStatus;
  }, [accounts, permittedAccountsByHostname]);

  const handleCreateAccount = useCallback(
    async () => {
      const { KeyringController } = Engine.context;
      try {
        setIsLoading(true);
        await KeyringController.addNewAccount();
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
          {},
        );
        AnalyticsV2.trackEvent(MetaMetricsEvents.SWITCHED_ACCOUNT, {
          source: metricsSource,
          number_of_accounts: accounts?.length,
        });
      } catch (e: any) {
        Logger.error(e, 'Error while trying to add a new account.');
      } finally {
        setIsLoading(false);
      }
    },
    /* eslint-disable-next-line */
    [setIsLoading],
  );

  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const newActiveAddress = await addPermittedAccounts(
        hostname,
        selectedAddresses,
      );
      const activeAccountName = getAccountNameWithENS({
        accountAddress: newActiveAddress,
        accounts,
        ensByAccountAddress,
      });
      const connectedAccountLength = selectedAddresses.length;
      let labelOptions: ToastOptions['labelOptions'] = [];
      if (connectedAccountLength > 1) {
        labelOptions = [
          { label: `${connectedAccountLength} `, isBold: true },
          {
            label: `${strings('toast.accounts_connected')}\n`,
          },
          { label: `${activeAccountName} `, isBold: true },
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
        accountAddress: newActiveAddress,
        accountAvatarType,
      });
      const totalAccounts = accountsLength;
      // TODO: confirm this value is the newly added accounts or total connected accounts
      const connectedAccounts = connectedAccountLength;
      AnalyticsV2.trackEvent(MetaMetricsEvents.ADD_ACCOUNT_DAPP_PERMISSIONS, {
        number_of_accounts: totalAccounts,
        number_of_accounts_connected: connectedAccounts,
        number_of_networks: nonTestnetNetworks,
      });
    } catch (e: any) {
      Logger.error(e, 'Error while trying to connect to a dApp.');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedAddresses,
    accounts,
    setIsLoading,
    hostname,
    ensByAccountAddress,
    toastRef,
    accountAvatarType,
    accountsLength,
    nonTestnetNetworks,
  ]);

  useEffect(() => {
    if (userIntent === USER_INTENT.None) return;

    const handleUserActions = (action: USER_INTENT) => {
      switch (action) {
        case USER_INTENT.Confirm: {
          handleConnect();
          hideSheet(() => {
            AnalyticsV2.trackEvent(MetaMetricsEvents.SWITCHED_ACCOUNT, {
              source: metricsSource,
              number_of_accounts: accounts?.length,
            });
          });
          break;
        }
        case USER_INTENT.Create:
        case USER_INTENT.CreateMultiple: {
          handleCreateAccount();
          break;
        }
        case USER_INTENT.Cancel: {
          hideSheet();
          break;
        }
        case USER_INTENT.Import: {
          navigation.navigate('ImportPrivateKeyView');
          // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
          AnalyticsV2.trackEvent(
            MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
            {},
          );

          break;
        }
        case USER_INTENT.ConnectHW: {
          navigation.navigate('ConnectQRHardwareFlow');
          // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
          AnalyticsV2.trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET, {});

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
    hideSheet,
    handleCreateAccount,
    handleConnect,
    accounts?.length,
  ]);

  const renderConnectedScreen = useCallback(
    () => (
      <AccountPermissionsConnected
        isLoading={isLoading}
        onSetSelectedAddresses={setSelectedAddresses}
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={hideSheet}
        accounts={accountsFilteredByPermissions.permitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={[activeAddress]}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
        accountAvatarType={accountAvatarType}
      />
    ),
    [
      ensByAccountAddress,
      activeAddress,
      isLoading,
      accountsFilteredByPermissions,
      setSelectedAddresses,
      setPermissionsScreen,
      hideSheet,
      favicon,
      hostname,
      secureIcon,
      accountAvatarType,
    ],
  );

  const renderConnectScreen = useCallback(
    () => (
      <AccountConnectMultiSelector
        accounts={accountsFilteredByPermissions.unpermitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={selectedAddresses}
        onSelectAddress={setSelectedAddresses}
        isLoading={isLoading}
        onUserAction={setUserIntent}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
        isAutoScrollEnabled={false}
      />
    ),
    [
      ensByAccountAddress,
      selectedAddresses,
      isLoading,
      accountsFilteredByPermissions,
      setUserIntent,
      favicon,
      hostname,
      secureIcon,
    ],
  );

  const renderRevokeScreen = useCallback(
    () => (
      <AccountPermissionsRevoke
        accounts={accountsFilteredByPermissions.permitted}
        onSetPermissionsScreen={setPermissionsScreen}
        ensByAccountAddress={ensByAccountAddress}
        permittedAddresses={permittedAccountsByHostname}
        isLoading={isLoading}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
        accountAvatarType={accountAvatarType}
      />
    ),
    [
      ensByAccountAddress,
      isLoading,
      permittedAccountsByHostname,
      accountsFilteredByPermissions,
      setPermissionsScreen,
      favicon,
      hostname,
      secureIcon,
      accountAvatarType,
    ],
  );

  const renderPermissionsScreens = useCallback(() => {
    switch (permissionsScreen) {
      case AccountPermissionsScreens.Connected:
        return renderConnectedScreen();
      case AccountPermissionsScreens.Connect:
        return renderConnectScreen();
      case AccountPermissionsScreens.Revoke:
        return renderRevokeScreen();
    }
  }, [
    permissionsScreen,
    renderConnectedScreen,
    renderConnectScreen,
    renderRevokeScreen,
  ]);

  return (
    <SheetBottom reservedMinOverlayHeight={0} ref={sheetRef}>
      {renderPermissionsScreens()}
    </SheetBottom>
  );
};

export default AccountPermissions;
