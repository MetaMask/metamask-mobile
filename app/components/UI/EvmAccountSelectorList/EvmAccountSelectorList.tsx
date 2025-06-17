// Third party dependencies.
import React, { useCallback, useRef, useMemo } from 'react';
import { Alert, InteractionManager, ScrollViewProps, View } from 'react-native';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';
import { shallowEqual, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { deepEqual } from 'fast-equals';
import { FlashList } from '@shopify/flash-list';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import {
  areAddressesEqual,
  formatAddress,
  getLabelTextByAddress,
  toFormattedAddress,
} from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { strings } from '../../../../locales/i18n';
import { Account, Assets } from '../../hooks/useAccounts';
import Engine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies.
import { EvmAccountSelectorListProps } from './EvmAccountSelectorList.types';
import styleSheet from './EvmAccountSelectorList.styles';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { RootState } from '../../../reducers';
import { ACCOUNT_SELECTOR_LIST_TESTID } from './EvmAccountSelectorList.constants';
import { toHex } from '@metamask/controller-utils';
import AccountNetworkIndicator from '../AccountNetworkIndicator';
import { Skeleton } from '../../../component-library/components/Skeleton';
import { selectMultichainAccountsState1Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { useSheetStyleStyleVars } from '../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog';
import EvmAccountSelectorListItem from './EvmAccountSelectorListItem';

const useStableReference = <T,>(value: T) => {
  const ref = useRef<T>(value);
  return useMemo(() => {
    if (deepEqual(ref.current, value)) {
      return ref.current;
    }
    ref.current = value;
    return value;
  }, [value]);
};

/**
 * @deprecated This component is deprecated in favor of the CaipAccountSelectorList component.
 * Functionally they should be nearly identical except that EvmAccountSelectorList expects
 * Hex addressess where as CaipAccountSelectorList expects CaipAccountIds.
 *
 * If changes need to be made to this component, please instead make them to CaipAccountSelectorList
 * and adopt that component instead.
 */
const EvmAccountSelectorList = ({
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
  testID,
}: EvmAccountSelectorListProps) => {
  const { navigate } = useNavigation();
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountListRef = useRef<any>(null);
  const accountsLengthRef = useRef<number>(0);

  // Use constant empty object to prevent useStyles from recreating styles
  const emptyVars = useMemo(() => ({}), []);
  const { styles } = useStyles(styleSheet, emptyVars);

  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );

  const getKeyExtractor = ({ address }: Account) => address;
  const useMultichainAccountDesign = useSelector(
    selectMultichainAccountsState1Enabled,
  );

  const selectedAddressesLookup = useMemo(() => {
    if (!selectedAddresses?.length) return null;
    const lookupSet = new Set<string>();
    selectedAddresses.forEach((addr) => {
      if (addr) lookupSet.add(toFormattedAddress(addr));
    });
    return lookupSet;
  }, [selectedAddresses]);

  const renderAccountBalances = useCallback(
    (
      { fiatBalance }: Assets,
      partialAccount: { address: string; scopes: CaipChainId[] },
      isLoadingAccount: boolean,
    ) => {
      const fiatBalanceStrSplit = fiatBalance.split('\n');
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';

      return (
        <View
          style={styles.balancesContainer}
          testID={`${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${partialAccount.address}`}
        >
          {isLoadingAccount ? (
            <Skeleton width={60} height={24} />
          ) : (
            <>
              <SensitiveText
                length={SensitiveTextLength.Long}
                style={styles.balanceLabel}
                isHidden={privacyMode}
              >
                {fiatBalanceAmount}
              </SensitiveText>

              <AccountNetworkIndicator partialAccount={partialAccount} />
            </>
          )}
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
      index,
    }: {
      address: string;
      isAccountRemoveable: boolean;
      isSelected: boolean;
      index: number;
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
                  // If removing the selected account, choose an adjacent one
                  const nextActiveIndex = index === 0 ? 1 : index - 1;
                  nextActiveAddress = accounts[nextActiveIndex]?.address;
                } else {
                  // Not removing selected account, so keep current selection
                  nextActiveAddress =
                    selectedAddresses?.[0] ||
                    accounts.find((acc) => acc.isSelected)?.address ||
                    '';
                }

                // Switching accounts on the PreferencesController must happen before account is removed from the KeyringController, otherwise UI will break.
                // If needed, place Engine.setSelectedAddress in onRemoveImportedAccount callback.
                onRemoveImportedAccount?.({
                  removedAddress: address,
                  nextActiveAddress,
                });
                // Revocation of accounts from PermissionController is needed whenever accounts are removed.
                // If there is an instance where this is not the case, this logic will need to be updated.
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

  const addresses = useStableReference(accounts.map((a) => a.address));

  const shortAddressMap = useMemo(() => {
    const map = new Map<string, string>();
    addresses.forEach((address) => {
      map.set(address, formatAddress(address, 'short'));
    });
    return map;
  }, [addresses]);

  const tagLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    addresses.forEach((address) => {
      map.set(address, getLabelTextByAddress(address) ?? '');
    });
    return map;
  }, [addresses]);

  const renderAccountItem = useCallback(
    ({ item, index }: { item: Account; index: number }) => (
      <EvmAccountSelectorListItem
        account={item}
        index={index}
        shortAddress={shortAddressMap.get(item.address) || ''}
        tagLabel={tagLabelMap.get(item.address) || ''}
        ensName={ensByAccountAddress[item.address]}
        isLoading={isLoading}
        isSelectionDisabled={isSelectionDisabled}
        isMultiSelect={isMultiSelect}
        isSelectWithoutMenu={isSelectWithoutMenu}
        selectedAddressesLookup={selectedAddressesLookup}
        accountAvatarType={accountAvatarType}
        renderRightAccessory={renderRightAccessory}
        renderAccountBalances={renderAccountBalances}
        onLongPress={onLongPress}
        onSelectAccount={onSelectAccount}
        useMultichainAccountDesign={useMultichainAccountDesign}
        onNavigateToAccountActions={onNavigateToAccountActions}
      />
    ),
    [
      shortAddressMap,
      tagLabelMap,
      ensByAccountAddress,
      isLoading,
      isSelectionDisabled,
      isMultiSelect,
      isSelectWithoutMenu,
      selectedAddressesLookup,
      accountAvatarType,
      renderRightAccessory,
      renderAccountBalances,
      onLongPress,
      onSelectAccount,
      useMultichainAccountDesign,
      onNavigateToAccountActions,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accounts.length || !isAutoScrollEnabled) return;
    if (accountsLengthRef.current !== accounts.length) {
      let selectedAccount: Account | undefined;

      if (selectedAddresses?.length) {
        const selectedAddress = selectedAddresses[0];
        selectedAccount = accounts.find((acc) =>
          areAddressesEqual(acc.address, selectedAddress),
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

  const { maxSheetHeight, screenWidth } = useSheetStyleStyleVars();
  const listItemHeight = 80;
  const addAccountBuffer = 200;
  // Clamp between 300 to maxSheetSize, and subtract the add account button area
  const listHeight =
    Math.max(300, Math.min(maxSheetHeight, listItemHeight * accounts.length)) -
    addAccountBuffer;

  return (
    <View style={{ height: listHeight }}>
      <FlashList
        ref={accountListRef}
        onContentSizeChange={onContentSizeChanged}
        data={accounts}
        keyExtractor={getKeyExtractor}
        renderItem={renderAccountItem}
        estimatedItemSize={listItemHeight}
        testID={testID ?? ACCOUNT_SELECTOR_LIST_TESTID}
        renderScrollComponent={
          ScrollView as React.ComponentType<ScrollViewProps>
        }
        // Additional optmisations
        estimatedListSize={{ height: listHeight, width: screenWidth }}
        removeClippedSubviews
        viewabilityConfig={{
          waitForInteraction: true,
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 1000,
        }}
        decelerationRate={0}
        disableAutoLayout
      />
    </View>
  );
};

export default React.memo(EvmAccountSelectorList);
