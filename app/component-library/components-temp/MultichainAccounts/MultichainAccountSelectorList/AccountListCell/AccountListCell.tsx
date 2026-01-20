import React, { memo, useCallback } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../hooks';
import AccountCell from '../../AccountCell';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListCellProps } from './AccountListCell.types';
import Checkbox from '../../../../components/Checkbox';

const AccountListCell = memo(
  ({
    accountGroup,
    avatarAccountType,
    isSelected,
    onSelectAccount,
    showCheckbox = false,
    chainId,
    hideMenu = false,
  }: AccountListCellProps) => {
    const { styles } = useStyles(createStyles, {
      isSelected,
    });

    const handlePress = useCallback(() => {
      onSelectAccount(accountGroup);
    }, [accountGroup, onSelectAccount]);

    return (
      <View style={styles.accountItem}>
        <View style={styles.accountCellWrapper}>
          <AccountCell
            startAccessory={
              showCheckbox ? (
                <View testID={`account-list-cell-checkbox-${accountGroup.id}`}>
                  <Checkbox isChecked={isSelected} onPress={handlePress} />
                </View>
              ) : undefined
            }
            accountGroup={accountGroup}
            avatarAccountType={avatarAccountType}
            chainId={chainId}
            hideMenu={hideMenu}
            onSelectAccount={handlePress}
          />
        </View>
      </View>
    );
  },
);

AccountListCell.displayName = 'AccountListCell';

export default AccountListCell;
