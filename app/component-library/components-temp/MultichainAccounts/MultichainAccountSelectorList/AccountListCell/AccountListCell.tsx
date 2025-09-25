import React, { memo, useCallback } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../hooks';
import AccountCell from '../../AccountCell';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListCellProps } from './AccountListCell.types';
import Checkbox from '../../../../components/Checkbox';
import ListItemSelect from '../../../../components/List/ListItemSelect';

const AccountListCell = memo(
  ({
    accountGroup,
    avatarAccountType,
    isSelected,
    onSelectAccount,
    showCheckbox = false,
  }: AccountListCellProps) => {
    const { styles } = useStyles(createStyles, {});

    const handlePress = useCallback(() => {
      onSelectAccount(accountGroup);
    }, [accountGroup, onSelectAccount]);

    return (
      <ListItemSelect
        isSelected={isSelected}
        style={styles.accountItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
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
          isSelected={isSelected}
        />
      </ListItemSelect>
    );
  },
);

AccountListCell.displayName = 'AccountListCell';

export default AccountListCell;
