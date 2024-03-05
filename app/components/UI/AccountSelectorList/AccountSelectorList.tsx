// Third party dependencies.
import { KeyringTypes } from '@metamask/keyring-controller';
import type { Hex } from '@metamask/utils';
import React, { useCallback, useRef } from 'react';
import { Alert, ListRenderItem, Platform, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';

// External dependencies.
import { strings } from '../../../../locales/i18n';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import UntypedEngine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import {
  formatAddress,
  getLabelTextByAddress,
  safeToChecksumAddress,
} from '../../../util/address';
import { Account, Assets } from '../../hooks/useAccounts';

// Internal dependencies.
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { forgetLedger } from '../../../core/Ledger/Ledger';
import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from '../../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds.js';
import generateTestId from '../../../../wdio/utils/generateTestId';
import styleSheet from './AccountSelectorList.styles';
import { AccountSelectorListProps } from './AccountSelectorList.types';

const AccountSelectorList = ({
  onSelectAccount,
  onRemoveImportedAccount,
  accounts,
  ensByAccountAddress,
  isLoading = false,
  selectedAddresses,
  isMultiSelect = false,
  renderRightAccessory,
  isSelectionDisabled,
  isRemoveAccountEnabled = false,
  isAutoScrollEnabled = true,
  ...props
}: AccountSelectorListProps) => {

  const { trackEvent } = useMetrics();
  const Engine = UntypedEngine as any;
  const accountListRef = useRef<any>(null);
  const accountsLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const getKeyExtractor = ({ address }: Account) => address;

  const renderAccountBalances = useCallback(
    ({ fiatBalance, tokens }: Assets, address: string) => (
      <View
        style={styles.balancesContainer}
        {...generateTestId(
          Platform,
          `${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${address}`,
        )}
      >
        <Text style={styles.balanceLabel}>{fiatBalance}</Text>
        {tokens && <AvatarGroup tokenList={tokens} />}
      </View>
    ),
    [styles.balancesContainer, styles.balanceLabel],
  );

  const onLongPress = useCallback(
    ({
      address,
      keyringType,
      isSelected,
      index,
    }: {
      address: Hex;
      keyringType: KeyringTypes;
      isSelected: boolean;
      index: number;
    }) => {
      if (!isRemoveAccountEnabled) return;

      switch(keyringType){
        case KeyringTypes.simple: {
          Alert.alert(
            strings('accounts.remove_account_title'),
            strings('accounts.remove_account_message'),
            [
              {
                text: strings('accounts.no'),
                onPress: () => false,
                style: 'cancel',
              },
              {
                text: strings('accounts.yes_remove_it'),
                onPress: async () => {
                  // TODO: Refactor account deletion logic to make more robust.
                  const selectedAddressOverride = selectedAddresses?.[0];
                  const account = accounts.find(
                    ({ isSelected: isAccountSelected, address: accountAddress }) =>
                      selectedAddressOverride
                        ? safeToChecksumAddress(selectedAddressOverride) ===
                          safeToChecksumAddress(accountAddress)
                        : isAccountSelected,
                  ) as Account;
                  let nextActiveAddress = account?.address;
                  if (isSelected) {
                    const nextActiveIndex = index === 0 ? 1 : index - 1;
                    nextActiveAddress = accounts[nextActiveIndex]?.address;
                  }
                  // Switching accounts on the PreferencesController must happen before account is removed from the KeyringController, otherwise UI will break.
                  // If needed, place PreferencesController.setSelectedAddress in onRemoveImportedAccount callback.
                  onRemoveImportedAccount?.({
                    removedAddress: address,
                    nextActiveAddress,
                  });
                  await Engine.context.KeyringController.removeAccount(address);
                  // Revocation of accounts from PermissionController is needed whenever accounts are removed.
                  // If there is an instance where this is not the case, this logic will need to be updated.
                  removeAccountsFromPermissions([address]);
                },
              },
            ],
            { cancelable: false },
          );

          break;
          }
        case KeyringTypes.qr: {

          Alert.alert(
            strings('accounts.forget_qr_device_title'),
            strings('accounts.forget_qr_device_message'),
            [
              {
                text: strings('accounts.no'),
                onPress: () => false,
                style: 'cancel',
              },
              {
                text: strings('accounts.yes_remove_it'),
                onPress: async () => {
                  const { PreferencesController, KeyringController } = Engine.context as any;

                  // removedAccounts and remainingAccounts are not checksummed here.
                  const { removedAccounts, remainingAccounts } =
                    await KeyringController.forgetQRDevice();
                  PreferencesController.setSelectedAddress(
                    remainingAccounts[remainingAccounts.length - 1],
                  );
                  const checksummedRemovedAccounts = removedAccounts.map(
                    safeToChecksumAddress,
                  );
                  removeAccountsFromPermissions(checksummedRemovedAccounts);
                },
              },
            ],
            { cancelable: false },
          );

          break;
        }
        case KeyringTypes.ledger: {
          Alert.alert(
            strings('accounts.forget_ledger_device_title'),
            strings('accounts.forget_ledger_device_message'),
            [
              {
                text: strings('accounts.no'),
                onPress: () => false,
                style: 'cancel',
              },
              {
                text: strings('accounts.yes_remove_it'),
                onPress: async () => {
                  await forgetLedger();
                  trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_FORGOTTEN, {
                    device_type: 'Ledger',
                  });
                  removeAccountsFromPermissions([address]);
                },
              },
            ],
            { cancelable: false },
          );

        }

        default: break;
      }
    },
    /* eslint-disable-next-line */
    [
      accounts,
      onRemoveImportedAccount,
      isRemoveAccountEnabled,
      selectedAddresses,
    ],
  );

  const renderAccountItem: ListRenderItem<Account> = useCallback(
    ({
      item: { name, address, assets, type, isSelected, balanceError },
      index,
    }) => {
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = getLabelTextByAddress(address);
      const ensName = ensByAccountAddress[address];
      const accountName =
        isDefaultAccountName(name) && ensName ? ensName : name;
      const isDisabled = !!balanceError || isLoading || isSelectionDisabled;
      const cellVariant = isMultiSelect
        ? CellVariant.MultiSelect
        : CellVariant.Select;
      let isSelectedAccount = isSelected;
      if (selectedAddresses) {
        isSelectedAccount = selectedAddresses.includes(address);
      }

      const cellStyle = {
        opacity: isLoading ? 0.5 : 1,
      };

      return (
        <Cell
          onLongPress={() => {
            onLongPress({
              address,
              keyringType: type,
              isSelected: isSelectedAccount,
              index,
            });
          }}
          variant={cellVariant}
          isSelected={isSelectedAccount}
          title={accountName}
          secondaryText={shortAddress}
          tertiaryText={balanceError}
          onPress={() => onSelectAccount?.(address, isSelectedAccount)}
          avatarProps={{
            variant: AvatarVariant.Account,
            type: accountAvatarType,
            accountAddress: address,
          }}
          tagLabel={tagLabel ? strings(tagLabel) : tagLabel}
          disabled={isDisabled}
          style={cellStyle}
        >
          {renderRightAccessory?.(address, accountName) ||
            (assets && renderAccountBalances(assets, address))}
        </Cell>
      );
    },
    [
      accountAvatarType,
      onSelectAccount,
      renderAccountBalances,
      ensByAccountAddress,
      isLoading,
      selectedAddresses,
      isMultiSelect,
      renderRightAccessory,
      isSelectionDisabled,
      onLongPress,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accounts.length || !isAutoScrollEnabled) return;
    if (accountsLengthRef.current !== accounts.length) {
      const selectedAddressOverride = selectedAddresses?.[0];
      const account = accounts.find(({ isSelected, address }) =>
        selectedAddressOverride
          ? safeToChecksumAddress(selectedAddressOverride) ===
            safeToChecksumAddress(address)
          : isSelected,
      );
      accountListRef?.current?.scrollToOffset({
        offset: account?.yOffset,
        animated: false,
      });
      accountsLengthRef.current = accounts.length;
    }
  }, [accounts, selectedAddresses, isAutoScrollEnabled]);

  return (
    <FlatList
      ref={accountListRef}
      onContentSizeChange={onContentSizeChanged}
      data={accounts}
      keyExtractor={getKeyExtractor}
      renderItem={renderAccountItem}
      // Increasing number of items at initial render fixes scroll issue.
      initialNumToRender={999}
      {...props}
    />
  );
};

export default AccountSelectorList;
