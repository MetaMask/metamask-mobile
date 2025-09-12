import React, { memo, useCallback } from 'react';
import { TouchableOpacity } from 'react-native';

import { useStyles } from '../../../../hooks';
import AccountCell from '../../AccountCell';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListCellProps } from './AccountListCell.types';

const AccountListCell = memo(
  ({
    accountGroup,
    avatarAccountType,
    isSelected,
    onSelectAccount,
  }: AccountListCellProps) => {
    const { styles } = useStyles(createStyles, {});

    const handlePress = useCallback(() => {
      onSelectAccount(accountGroup);
    }, [accountGroup, onSelectAccount]);

    return (
      <TouchableOpacity
        style={styles.accountItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <AccountCell
          accountGroup={accountGroup}
          avatarAccountType={avatarAccountType}
          isSelected={isSelected}
        />
      </TouchableOpacity>
    );
  },
);

AccountListCell.displayName = 'AccountListCell';

export default AccountListCell;
