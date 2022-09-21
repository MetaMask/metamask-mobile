// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import UntypedEngine from '../../../core/Engine';
import {
  addPermittedAccounts,
  getPermittedAccountsByOrigin,
} from '../../../core/Permissions';
import AccountConnectMultiSelector from '../AccountConnect/AccountConnectMultiSelector';
import Logger from '../../../util/Logger';
import {
  ToastContext,
  ToastVariant,
} from '../../../component-library/components/Toast';
import analyticsV2 from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { useAccounts, Account } from '../../../util/accounts/hooks/useAccounts';
import getAccountNameWithENS from '../../../util/accounts/utils';

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
      metadata: { origin },
    },
  } = props.route.params;
  const { toastRef } = useContext(ToastContext);
  const [isLoading, setIsLoading] = useState(false);
  const permittedAccountsList = useSelector(
    (state: any) => state.engine.backgroundState.PermissionController,
  );
  const thirdPartyApiMode = useSelector(
    (state: any) => state.privacy.thirdPartyApiMode,
  );
  const permittedAccountsByOrigin = getPermittedAccountsByOrigin(
    permittedAccountsList,
    origin,
  );
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const sheetRef = useRef<SheetBottomRef>(null);
  const [permissionsScreen, setPermissionsScreen] =
    useState<AccountPermissionsScreens>(AccountPermissionsScreens.Connected);
  const { accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
  const activeAddress: string = permittedAccountsByOrigin[0];

  const dismissSheet = () => sheetRef?.current?.hide?.();

  const dismissSheetWithCallback = (callback?: () => void) =>
    sheetRef?.current?.hide?.(callback);

  const accountsFilteredByPermissions = useMemo(() => {
    const accountsByPermittedStatus: Record<
      'permitted' | 'unpermitted',
      Account[]
    > = {
      permitted: [],
      unpermitted: [],
    };

    accounts.forEach((account) => {
      if (permittedAccountsByOrigin.includes(account.address)) {
        accountsByPermittedStatus.permitted.push(account);
      } else {
        accountsByPermittedStatus.unpermitted.push(account);
      }
    });

    return accountsByPermittedStatus;
  }, [accounts, permittedAccountsList]);

  const onRefreshTransactionHistory = () =>
    thirdPartyApiMode &&
    InteractionManager.runAfterInteractions(async () => {
      Engine.refreshTransactionHistory();
    });

  const onCreateAccount = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      setIsLoading(true);
      await KeyringController.addNewAccount();
      analyticsV2.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_ADDED_NEW_ACCOUNT);
    } catch (e: any) {
      Logger.error(e, 'Error while trying to add a new account.');
    } finally {
      setIsLoading(false);
    }
    /* eslint-disable-next-line */
  }, [setIsLoading]);

  const onConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const newActiveAddress = await addPermittedAccounts(
        origin,
        selectedAddresses,
      );
      const activeAccountName = getAccountNameWithENS({
        accountAddress: newActiveAddress,
        accounts,
        ensByAccountAddress,
      });
      const connectedAccountLength = selectedAddresses.length;
      toastRef?.current?.showToast({
        variant: ToastVariant.Account,
        labelOptions: [
          { label: `Connected` },
          { label: ` ${connectedAccountLength}`, isBold: true },
          {
            label: ` more account${connectedAccountLength > 1 ? 's' : ''} to.`,
          },
          { label: ` ${origin}`, isBold: true },
          { label: `.` },
          { label: `\nSwitched to account` },
          { label: ` ${activeAccountName}`, isBold: true },
          { label: '.' },
        ],
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
    origin,
    ensByAccountAddress,
  ]);

  const renderConnectedScreen = useCallback(() => {
    return (
      <AccountPermissionsConnected
        isLoading={isLoading}
        onSetSelectedAddresses={setSelectedAddresses}
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={dismissSheet}
        accounts={accountsFilteredByPermissions.permitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={[activeAddress]}
        {...props}
      />
    );
  }, [
    ensByAccountAddress,
    activeAddress,
    isLoading,
    accountsFilteredByPermissions,
    setSelectedAddresses,
    setPermissionsScreen,
    dismissSheet,
  ]);

  const renderConnectScreen = useCallback(() => {
    return (
      <AccountConnectMultiSelector
        accounts={accountsFilteredByPermissions.unpermitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={selectedAddresses}
        onSelectAddress={setSelectedAddresses}
        isLoading={isLoading}
        onDismissSheetWithCallback={dismissSheetWithCallback}
        onConnect={onConnect}
        onCreateAccount={onCreateAccount}
        {...props}
      />
    );
  }, [
    ensByAccountAddress,
    selectedAddresses,
    isLoading,
    accountsFilteredByPermissions,
    dismissSheetWithCallback,
    setIsLoading,
    onConnect,
    onCreateAccount,
  ]);

  const renderRevokeScreen = useCallback(() => {
    return (
      <AccountPermissionsRevoke
        accounts={accountsFilteredByPermissions.permitted}
        onSetPermissionsScreen={setPermissionsScreen}
        ensByAccountAddress={ensByAccountAddress}
        permittedAddresses={permittedAccountsByOrigin}
        isLoading={isLoading}
        onDismissSheet={dismissSheet}
        {...props}
      />
    );
  }, [
    accounts,
    ensByAccountAddress,
    isLoading,
    permittedAccountsByOrigin,
    accountsFilteredByPermissions,
    setPermissionsScreen,
    dismissSheet,
  ]);

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
