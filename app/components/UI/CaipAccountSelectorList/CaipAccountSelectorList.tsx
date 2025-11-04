// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import {
  Alert,
  InteractionManager,
  ListRenderItem,
  View,
  ViewStyle,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { shallowEqual, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../component-library/hooks';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import { formatAddress, getLabelTextByAddress } from '../../../util/address';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { strings } from '../../../../locales/i18n';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Account, Assets } from '../../hooks/useAccounts';
import Engine from '../../../core/Engine';
import {
  removeAccountsFromPermissions,
  sortMultichainAccountsByLastSelected,
} from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies.
import { CaipAccountSelectorListProps } from './CaipAccountSelectorList.types';
import styleSheet from './CaipAccountSelectorList.styles';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { ACCOUNT_SELECTOR_LIST_TESTID } from './CaipAccountSelectorList.constants';
import { toHex } from '@metamask/controller-utils';
import AccountNetworkIndicator from '../AccountNetworkIndicator/AccountNetworkIndicator';
import {
  CaipAccountId,
  parseCaipAccountId,
  CaipChainId,
} from '@metamask/utils';
import { selectAvatarAccountType } from '../../../selectors/settings';

const CaipAccountSelectorList = ({
  onSelectAccount,
  onRemoveImportedAccount,
  accounts,
  ensByAccountAddress,
  isLoading = false,
  selectedAddresses,
  isMultiSelect = false,
  isSelectWithoutMenu = false,
  renderRightAccessory,
  isSelectionDisabled,
  isRemoveAccountEnabled = false,
  isAutoScrollEnabled = true,
  privacyMode = false,
  ...props
}: CaipAccountSelectorListProps) => {
  const { navigate } = useNavigation();
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountListRef = useRef<any>(null);
  const accountsLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});

  const accountAvatarType = useSelector(selectAvatarAccountType, shallowEqual);
  const getKeyExtractor = ({ caipAccountId }: Account) => caipAccountId;

  const renderAccountBalances = useCallback(
    (
      { fiatBalance }: Assets,
      partialAccount: { address: string; scopes: CaipChainId[] },
    ) => {
      const fiatBalanceStrSplit = fiatBalance.split('\n');
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';
      return (
        <View
          style={styles.balancesContainer}
          testID={`${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${partialAccount.address}`}
        >
          <SensitiveText
            length={SensitiveTextLength.Long}
            style={styles.balanceLabel}
            isHidden={privacyMode}
          >
            {fiatBalanceAmount}
          </SensitiveText>
          <AccountNetworkIndicator partialAccount={partialAccount} />
        </View>
      );
    },
    [styles.balancesContainer, styles.balanceLabel, privacyMode],
  );

  const onLongPress = useCallback(
    ({
      address,
      isAccountRemoveable,
      isSelected,
      caipAccountId,
    }: {
      address: string;
      isAccountRemoveable: boolean;
      isSelected: boolean;
      caipAccountId: CaipAccountId;
    }) => {
      if (!isAccountRemoveable || !isRemoveAccountEnabled) return;
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
              InteractionManager.runAfterInteractions(async () => {
                // Determine which account should be active after removal
                let nextActiveAddress: string;

                if (isSelected) {
                  nextActiveAddress =
                    accounts.find((acc) => acc.caipAccountId !== caipAccountId)
                      ?.address || '';
                } else {
                  const nextCaipAccountIds = selectedAddresses.filter(
                    (selectedAddress) => selectedAddress !== caipAccountId,
                  );
                  const [nextCaipAccountId] =
                    sortMultichainAccountsByLastSelected(nextCaipAccountIds);

                  const nextAddress = nextCaipAccountId
                    ? parseCaipAccountId(nextCaipAccountId).address
                    : '';
                  const selectedAccountAddress = accounts.find(
                    (acc) => acc.isSelected,
                  )?.address;
                  nextActiveAddress =
                    nextAddress || selectedAccountAddress || '';
                }

                // Switching accounts on the PreferencesController must happen before account is removed from the KeyringController, otherwise UI will break.
                // If needed, place Engine.setSelectedAddress in onRemoveImportedAccount callback.
                onRemoveImportedAccount?.({
                  removedAddress: address,
                  nextActiveAddress,
                });
                // Revocation of accounts from PermissionController is needed whenever accounts are removed.
                // If there is an instance where this is not the case, this logic will need to be updated.
                // Fix this
                removeAccountsFromPermissions([toHex(address)]);
                await Engine.context.KeyringController.removeAccount(address);
              });
            },
          },
        ],
        { cancelable: false },
      );
    },
    [
      accounts,
      onRemoveImportedAccount,
      isRemoveAccountEnabled,
      selectedAddresses,
    ],
  );

  const onNavigateToAccountActions = useCallback(
    (selectedAccountAddress: string) => {
      const account = Engine.context.AccountsController.getAccountByAddress(
        selectedAccountAddress,
      );

      if (!account) return;

      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ACCOUNT_ACTIONS,
        params: { selectedAccount: account },
      });
    },
    [navigate],
  );

  const renderAccountItem: ListRenderItem<Account> = useCallback(
    ({
      item: {
        name,
        address,
        assets,
        type,
        isSelected,
        balanceError,
        caipAccountId,
        scopes,
      },
    }) => {
      const partialAccount = {
        address,
        scopes,
      };
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = getLabelTextByAddress(address);
      const ensName = ensByAccountAddress[address];
      const accountName =
        isDefaultAccountName(name) && ensName ? ensName : name;
      const isDisabled = !!balanceError || isLoading || isSelectionDisabled;
      let cellVariant = CellVariant.SelectWithMenu;
      if (isMultiSelect) {
        cellVariant = CellVariant.MultiSelect;
      }
      if (isSelectWithoutMenu) {
        cellVariant = CellVariant.Select;
      }
      let isSelectedAccount = isSelected;
      if (selectedAddresses.length > 0) {
        isSelectedAccount = selectedAddresses.includes(caipAccountId);
      }

      const cellStyle: ViewStyle = {
        opacity: isLoading ? 0.5 : 1,
      };
      if (!isMultiSelect) {
        cellStyle.alignItems = 'center';
      }

      const handleLongPress = () => {
        onLongPress({
          address,
          isAccountRemoveable:
            type === KeyringTypes.simple ||
            (type === KeyringTypes.snap && !isSolanaAddress(address)),
          isSelected: isSelectedAccount,
          caipAccountId,
        });
      };

      const handlePress = () => {
        onSelectAccount?.(caipAccountId, isSelectedAccount);
      };

      const handleButtonClick = () => {
        onNavigateToAccountActions(address);
      };

      const buttonProps = {
        onButtonClick: handleButtonClick,
        buttonTestId: WalletViewSelectorsIDs.ACCOUNT_ACTIONS,
      };

      const avatarProps = {
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: address,
      };

      return (
        <Cell
          key={address}
          onLongPress={handleLongPress}
          variant={cellVariant}
          isSelected={isSelectedAccount}
          title={accountName}
          secondaryText={shortAddress}
          showSecondaryTextIcon={false}
          tertiaryText={balanceError}
          onPress={handlePress}
          avatarProps={avatarProps}
          tagLabel={tagLabel}
          disabled={isDisabled}
          style={cellStyle}
          buttonProps={buttonProps}
        >
          {renderRightAccessory?.(address, accountName) ||
            (assets && renderAccountBalances(assets, partialAccount))}
        </Cell>
      );
    },
    [
      onNavigateToAccountActions,
      accountAvatarType,
      onSelectAccount,
      renderAccountBalances,
      ensByAccountAddress,
      isLoading,
      selectedAddresses,
      isMultiSelect,
      isSelectWithoutMenu,
      renderRightAccessory,
      isSelectionDisabled,
      onLongPress,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accounts.length || !isAutoScrollEnabled) return;
    if (accountsLengthRef.current !== accounts.length) {
      let selectedAccount: Account | undefined;

      if (selectedAddresses.length) {
        const selectedAddress = selectedAddresses[0];
        selectedAccount = accounts.find(
          (acc) => acc.caipAccountId === selectedAddress,
        );
      }
      // Fall back to the account with isSelected flag if no override or match found
      if (!selectedAccount) {
        selectedAccount = accounts.find((acc) => acc.isSelected);
      }

      accountListRef?.current?.scrollToOffset({
        offset: selectedAccount?.yOffset,
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
      testID={ACCOUNT_SELECTOR_LIST_TESTID}
      {...props}
    />
  );
};

export default React.memo(CaipAccountSelectorList);
