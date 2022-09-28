// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { ImageSourcePropType } from 'react-native';
import { isEqual } from 'lodash';

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
  ToastOptions,
  ToastVariant,
} from '../../../component-library/components/Toast';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { useAccounts, Account } from '../../hooks/useAccounts';
import getAccountNameWithENS from '../../../util/accounts';
import { IconName } from '../../../component-library/components/Icon';
import { getUrlObj } from '../../../util/browser';
import { getActiveTabUrl } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';

// Internal dependencies.
import {
  AccountPermissionsProps,
  AccountPermissionsScreens,
} from './AccountPermissions.types';
import AccountPermissionsConnected from './AccountPermissionsConnected';
import AccountPermissionsRevoke from './AccountPermissionsRevoke';

const AccountPermissions = (props: AccountPermissionsProps) => {
  const Engine = UntypedEngine as any;
  const {
    hostInfo: {
      metadata: { origin: hostname },
    },
  } = props.route.params;
  const origin: string = useSelector(getActiveTabUrl, isEqual);
  // TODO - Once we can pass metadata to permission system, pass origin instead of hostname into this component.
  // const hostname = useMemo(() => new URL(origin).hostname, [origin]);
  const secureIcon = useMemo(
    () =>
      (getUrlObj(origin) as URL).protocol === 'https:'
        ? IconName.LockFilled
        : IconName.WarningFilled,
    [origin],
  );
  /**
   * Get image url from favicon api.
   */
  const favicon: ImageSourcePropType = useMemo(() => {
    const iconUrl = `https://api.faviconkit.com/${hostname}/64`;
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
  const activeAddress: string = permittedAccountsByHostname[0];

  const dismissSheet = useCallback(
    () => sheetRef?.current?.hide?.(),
    [sheetRef],
  );

  const dismissSheetWithCallback = useCallback(
    (callback?: () => void) => sheetRef?.current?.hide?.(callback),
    [sheetRef],
  );

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

  const onCreateAccount = useCallback(
    async () => {
      const { KeyringController, PreferencesController } = Engine.context;
      try {
        setIsLoading(true);
        const { addedAccountAddress } = await KeyringController.addNewAccount();
        PreferencesController.setSelectedAddress(addedAccountAddress);
        AnalyticsV2.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_ADDED_NEW_ACCOUNT);
      } catch (e: any) {
        Logger.error(e, 'Error while trying to add a new account.');
      } finally {
        setIsLoading(false);
      }
    },
    /* eslint-disable-next-line */
    [setIsLoading],
  );

  const onConnect = useCallback(async () => {
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
          { label: `${connectedAccountLength}`, isBold: true },
          {
            label: `${strings('toast.accounts_connected')}\n`,
          },
        ];
      }
      labelOptions = labelOptions.concat([
        { label: activeAccountName, isBold: true },
        { label: strings('toast.now_active') },
      ]);
      toastRef?.current?.showToast({
        variant: ToastVariant.Account,
        labelOptions,
        accountAddress: newActiveAddress,
      });
    } catch (e: any) {
      Logger.error(e, 'Error while trying to connect to a dApp.');
    } finally {
      setIsLoading(false);
      dismissSheetWithCallback();
    }
  }, [
    selectedAddresses,
    accounts,
    setIsLoading,
    dismissSheetWithCallback,
    hostname,
    ensByAccountAddress,
    toastRef,
  ]);

  const renderConnectedScreen = useCallback(
    () => (
      <AccountPermissionsConnected
        isLoading={isLoading}
        onSetSelectedAddresses={setSelectedAddresses}
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={dismissSheet}
        accounts={accountsFilteredByPermissions.permitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={[activeAddress]}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
      />
    ),
    [
      ensByAccountAddress,
      activeAddress,
      isLoading,
      accountsFilteredByPermissions,
      setSelectedAddresses,
      setPermissionsScreen,
      dismissSheet,
      favicon,
      hostname,
      secureIcon,
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
        onDismissSheetWithCallback={dismissSheetWithCallback}
        onConnect={onConnect}
        onCreateAccount={onCreateAccount}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
      />
    ),
    [
      ensByAccountAddress,
      selectedAddresses,
      isLoading,
      accountsFilteredByPermissions,
      dismissSheetWithCallback,
      onConnect,
      onCreateAccount,
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
        onDismissSheet={dismissSheet}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
      />
    ),
    [
      ensByAccountAddress,
      isLoading,
      permittedAccountsByHostname,
      accountsFilteredByPermissions,
      setPermissionsScreen,
      dismissSheet,
      favicon,
      hostname,
      secureIcon,
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
