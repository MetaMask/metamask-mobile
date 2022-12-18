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
import { isDefaultAccountName } from '../../../util/ENSUtils';
import Logger from '../../../util/Logger';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { SelectedAccount } from '../../../components/UI/AccountSelectorList/AccountSelectorList.types';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { ToastOptions } from '../../../component-library/components/Toast/Toast.types';
import { useAccounts, Account } from '../../hooks/useAccounts';
import getAccountNameWithENS from '../../../util/accounts';
import { IconName } from '../../../component-library/components/Icon';
import { getActiveTabUrl } from '../../../util/transactions';
import { getUrlObj } from '../../../util/browser';
import { strings } from '../../../../locales/i18n';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { safeToChecksumAddress } from '../../../util/address';

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
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const origin: string = useSelector(getActiveTabUrl, isEqual);
  // TODO - Once we can pass metadata to permission system, pass origin instead of hostname into this component.
  const hostname = hostInfo.metadata.origin;
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
    const iconUrl = `https://api.faviconkit.com/${hostname}/64`;
    return { uri: iconUrl };
  }, [hostname]);

  const dismissSheet = useCallback(
    () => sheetRef?.current?.hide?.(),
    [sheetRef],
  );

  const dismissSheetWithCallback = useCallback(
    (callback?: () => void) => sheetRef?.current?.hide?.(callback),
    [sheetRef],
  );

  const onConnect = useCallback(
    async () => {
      const selectedAccounts: SelectedAccount[] = selectedAddresses.map(
        (address, index) => ({ address, lastUsed: Date.now() - index }),
      );
      const request = {
        ...hostInfo,
        metadata: {
          ...hostInfo.metadata,
          origin: hostname,
        },
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
        dismissSheet();
      }
    },
    /* eslint-disable-next-line */
    [
      selectedAddresses,
      hostInfo,
      accounts,
      ensByAccountAddress,
      hostname,
      accountAvatarType,
    ],
  );

  const onCreateAccount = useCallback(async (isMultiSelect?: boolean) => {
    const { KeyringController } = Engine.context;
    try {
      setIsLoading(true);
      const { addedAccountAddress } = await KeyringController.addNewAccount();
      const checksummedAddress = safeToChecksumAddress(
        addedAccountAddress,
      ) as string;
      !isMultiSelect && setSelectedAddresses([checksummedAddress]);
      AnalyticsV2.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_ADDED_NEW_ACCOUNT);
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      setIsLoading(false);
    }
    /* eslint-disable-next-line */
  }, []);

  const renderSingleConnectScreen = useCallback(() => {
    const selectedAddress = selectedAddresses[0];
    const selectedAccount = accounts.find(
      (account) => account.address === selectedAddress,
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
        onSetScreen={setScreen}
        onDismissSheet={dismissSheet}
        onConnect={onConnect}
        defaultSelectedAccount={defaultSelectedAccount}
        isLoading={isLoading}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
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
    favicon,
    hostname,
    secureIcon,
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
        onCreateAccount={() => onCreateAccount()}
        onDismissSheetWithCallback={dismissSheetWithCallback}
      />
    ),
    [
      accounts,
      ensByAccountAddress,
      selectedAddresses,
      isLoading,
      onCreateAccount,
      dismissSheetWithCallback,
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
        onDismissSheetWithCallback={dismissSheetWithCallback}
        onConnect={onConnect}
        onCreateAccount={() => onCreateAccount(true)}
        favicon={favicon}
        hostname={hostname}
        secureIcon={secureIcon}
      />
    ),
    [
      accounts,
      ensByAccountAddress,
      selectedAddresses,
      setSelectedAddresses,
      onConnect,
      isLoading,
      onCreateAccount,
      dismissSheetWithCallback,
      favicon,
      hostname,
      secureIcon,
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
    <SheetBottom reservedMinOverlayHeight={0} ref={sheetRef}>
      {renderConnectScreens()}
    </SheetBottom>
  );
};

export default AccountConnect;
