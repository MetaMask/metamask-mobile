import { KeyringTypes } from '@metamask/keyring-controller';
import { CaipChainId } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import React, { memo, useCallback, useMemo } from 'react';
import { ViewStyle } from 'react-native';
import {
  AvatarAccountType,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { Account, Assets } from '../../hooks/useAccounts';

import { toFormattedAddress } from '../../../util/address';

import { useNavigation } from '@react-navigation/native';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../component-library/hooks';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import styleSheet from './EvmAccountSelectorList.styles';

interface EvmAccountSelectorListItemProps {
  account: Account;
  index: number;
  shortAddress: string;
  tagLabel: string;
  ensName?: string;
  isLoading: boolean;
  isSelectionDisabled?: boolean;
  isMultiSelect: boolean;
  isSelectWithoutMenu: boolean;
  selectedAddressesLookup: Set<string> | null;
  accountAvatarType: AvatarAccountType;
  renderRightAccessory?: (
    address: string,
    accountName: string,
  ) => React.ReactNode;
  renderAccountBalances: (
    assets: Assets,
    partialAccount: { address: string; scopes: CaipChainId[] },
    isLoadingAccount: boolean,
  ) => React.ReactNode;
  onLongPress: (params: {
    address: string;
    isAccountRemoveable: boolean;
    isSelected: boolean;
    index: number;
  }) => void;
  onSelectAccount?: (address: string, isSelected: boolean) => void;
  useMultichainAccountDesign: boolean;
  onNavigateToAccountActions: (address: string) => void;
}

const EvmAccountSelectorListItem = memo<EvmAccountSelectorListItemProps>(
  ({
    account,
    index,
    shortAddress,
    tagLabel,
    ensName,
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
  }) => {
    const {
      name,
      address,
      assets,
      type,
      isSelected,
      balanceError,
      scopes,
      isLoadingAccount,
    } = account;

    const { navigate } = useNavigation();
    const emptyVars = useMemo(() => ({}), []);
    const { styles } = useStyles(styleSheet, emptyVars);

    // Memoize expensive calculations
    const partialAccount = useMemo(
      () => ({ address, scopes }),
      [address, scopes],
    );

    const accountName = useMemo(
      () => (isDefaultAccountName(name) && ensName ? ensName : name),
      [name, ensName],
    );

    const isDisabled = !!balanceError || isLoading || isSelectionDisabled;

    const cellVariant = useMemo(() => {
      if (isMultiSelect) return CellVariant.MultiSelect;
      if (isSelectWithoutMenu) return CellVariant.Select;
      return CellVariant.SelectWithMenu;
    }, [isMultiSelect, isSelectWithoutMenu]);

    const isSelectedAccount = useMemo(() => {
      if (selectedAddressesLookup) {
        return selectedAddressesLookup.has(toFormattedAddress(address));
      }
      return isSelected;
    }, [selectedAddressesLookup, address, isSelected]);

    const cellStyle: ViewStyle = useMemo(
      () => ({
        opacity: isLoading ? 0.5 : 1,
        ...(isMultiSelect ? {} : { alignItems: 'center' as const }),
      }),
      [isLoading, isMultiSelect],
    );

    const isAccountRemoveable = useMemo(
      () =>
        type === KeyringTypes.simple ||
        (type === KeyringTypes.snap && !isSolanaAddress(address)),
      [type, address],
    );

    const handleLongPress = useCallback(() => {
      onLongPress({
        address,
        isAccountRemoveable,
        isSelected: isSelectedAccount,
        index,
      });
    }, [onLongPress, address, isAccountRemoveable, isSelectedAccount, index]);

    const handlePress = useCallback(() => {
      onSelectAccount?.(address, isSelectedAccount);
    }, [onSelectAccount, address, isSelectedAccount]);

    const handleButtonClick = useCallback(() => {
      if (useMultichainAccountDesign) {
        const accountByAddr =
          Engine.context.AccountsController.getAccountByAddress(address);
        if (!accountByAddr) return;
        navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS, {
          account: accountByAddr,
        });
        return;
      }
      onNavigateToAccountActions(address);
    }, [
      useMultichainAccountDesign,
      onNavigateToAccountActions,
      address,
      navigate,
    ]);

    const buttonProps = useMemo(
      () => ({
        onButtonClick: handleButtonClick,
        buttonTestId: `${WalletViewSelectorsIDs.ACCOUNT_ACTIONS}-${index}`,
      }),
      [handleButtonClick, index],
    );

    const avatarProps = useMemo(
      () => ({
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: address,
      }),
      [accountAvatarType, address],
    );

    return (
      <Cell
        key={address}
        onLongPress={handleLongPress}
        variant={cellVariant}
        isSelected={isSelectedAccount}
        title={accountName}
        titleProps={{ style: styles.titleText }}
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
          (assets &&
            renderAccountBalances(assets, partialAccount, isLoadingAccount))}
      </Cell>
    );
  },
);

EvmAccountSelectorListItem.displayName = 'EvmAccountSelectorListItem';

export default EvmAccountSelectorListItem;
