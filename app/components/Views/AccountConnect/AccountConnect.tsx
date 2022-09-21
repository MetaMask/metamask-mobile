// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import UntypedEngine from '../../../core/Engine';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import Logger from '../../../util/Logger';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { SelectedAccount } from '../../../components/UI/AccountSelectorList/AccountSelectorList.types';
import {
  ToastContext,
  ToastVariant,
} from '../../../component-library/components/Toast';
import { useAccounts, Account } from '../../../util/accounts/hooks/useAccounts';
import getAccountNameWithENS from '../../../util/accounts/utils';

// Internal dependencies.
import {
  AccountConnectProps,
  AccountConnectScreens,
} from './AccountConnect.types';
import AccountConnectSingle from './AccountConnectSingle';
import AccountConnectSingleSelector from './AccountConnectSingleSelector';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';

const AccountConnect = (props: AccountConnectProps) => {
  const Engine = UntypedEngine as any;
  const { hostInfo } = props.route.params;
  const [isLoading, setIsLoading] = useState(false);
  const prevSelectedAddress = useRef();
  const shouldAutoSwitchSelectedAccount = useRef(true);
  const selectedWalletAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([
    selectedWalletAddress,
  ]);
  const sheetRef = useRef<SheetBottomRef>(null);
  const [screen, setScreen] = useState<AccountConnectScreens>(
    AccountConnectScreens.SingleConnect,
  );
  const { accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
  const { toastRef } = useContext(ToastContext);

  const dismissSheet = () => sheetRef?.current?.hide?.();

  const dismissSheetWithCallback = (callback?: () => void) =>
    sheetRef?.current?.hide?.(callback);

  const onConnect = useCallback(async () => {
    const { origin } = hostInfo.metadata;
    const selectedAccounts: SelectedAccount[] = selectedAddresses.map(
      (address, index) => ({ address, lastUsed: Date.now() - index }),
    );
    const request = {
      ...hostInfo,
      permissions: { ...hostInfo.permissions },
      approvedAccounts: selectedAccounts,
    };
    const connectedAccountLength = selectedAccounts.length;
    const activeAddress = selectedAccounts[0].address;
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
      toastRef?.current?.showToast({
        variant: ToastVariant.Account,
        labelOptions: [
          { label: `Connected` },
          { label: ` ${connectedAccountLength}`, isBold: true },
          {
            label: ` account${connectedAccountLength > 1 ? 's' : ''} to`,
          },
          { label: ` ${origin}`, isBold: true },
          { label: `.` },
          { label: `\n${activeAccountName}`, isBold: true },
          { label: ` is now active.` },
        ],
        accountAddress: activeAddress,
      });
    } catch (e: any) {
      Logger.error(e, 'Error while trying to connect to a dApp.');
    } finally {
      setIsLoading(false);
      dismissSheet();
    }
  }, [selectedAddresses, hostInfo, accounts, ensByAccountAddress]);

  const onCreateAccount = useCallback(async (isMultiSelect?: boolean) => {
    const { KeyringController } = Engine.context;
    try {
      shouldAutoSwitchSelectedAccount.current = !isMultiSelect;
      setIsLoading(true);
      await KeyringController.addNewAccount();
      AnalyticsV2.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_ADDED_NEW_ACCOUNT);
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      setIsLoading(false);
    }
    /* eslint-disable-next-line */
  }, []);

  // This useEffect is used for auto selecting the newly created account post account creation.
  useEffect(() => {
    if (isLoading && prevSelectedAddress.current !== selectedWalletAddress) {
      shouldAutoSwitchSelectedAccount.current &&
        setSelectedAddresses([selectedWalletAddress]);
      prevSelectedAddress.current = selectedWalletAddress;
    }
    if (!prevSelectedAddress.current) {
      prevSelectedAddress.current = selectedWalletAddress;
    }
  }, [selectedWalletAddress, isLoading, selectedAddresses]);

  const renderSingleConnectScreen = useCallback(() => {
    const selectedAddress = selectedAddresses[0];
    const selectedAccount = accounts.find((account) => {
      return account.address === selectedAddress;
    });
    const ensName = ensByAccountAddress[selectedAddress];
    const defaultSelectedAccount: Account | undefined = !!selectedAccount
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
        onSetScreen={setScreen}
        onDismissSheet={dismissSheet}
        onConnect={onConnect}
        defaultSelectedAccount={defaultSelectedAccount}
        isLoading={isLoading}
        {...props}
      />
    );
  }, [
    accounts,
    ensByAccountAddress,
    selectedAddresses,
    onConnect,
    isLoading,
    setScreen,
    dismissSheet,
    setSelectedAddresses,
  ]);

  const renderSingleConnectSelectorScreen = useCallback(() => {
    return (
      <AccountConnectSingleSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        onSetScreen={setScreen}
        onSetSelectedAddresses={setSelectedAddresses}
        selectedAddresses={selectedAddresses}
        isLoading={isLoading}
        onCreateAccount={() => onCreateAccount()}
        onDismissSheetWithCallback={dismissSheetWithCallback}
      />
    );
  }, [
    accounts,
    ensByAccountAddress,
    selectedAddresses,
    isLoading,
    onCreateAccount,
    dismissSheetWithCallback,
    setSelectedAddresses,
    setScreen,
  ]);

  const renderMultiConnectSelectorScreen = useCallback(() => {
    return (
      <AccountConnectMultiSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={selectedAddresses}
        onSelectAddress={setSelectedAddresses}
        isLoading={isLoading}
        onDismissSheetWithCallback={dismissSheetWithCallback}
        onConnect={onConnect}
        onCreateAccount={() => onCreateAccount(true)}
        {...props}
      />
    );
  }, [
    accounts,
    ensByAccountAddress,
    selectedAddresses,
    setSelectedAddresses,
    onConnect,
    isLoading,
    onCreateAccount,
    dismissSheetWithCallback,
  ]);

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
    <SheetBottom reservedMinOverlayHeight={0} ref={sheetRef}>
      {renderConnectScreens()}
    </SheetBottom>
  );
};

export default AccountConnect;
