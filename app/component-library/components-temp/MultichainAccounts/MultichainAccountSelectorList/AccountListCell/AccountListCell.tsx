import React, { memo, useCallback } from 'react';

import { useStyles } from '../../../../hooks';
import AccountCell from '../../AccountCell';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListCellProps } from './AccountListCell.types';
import ListItemSelect from '../../../../components/List/ListItemSelect';
import ListItemMultiSelect from '../../../../components/List/ListItemMultiSelect';

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

    const WrapperComponent = showCheckbox
      ? ListItemMultiSelect
      : ListItemSelect;

    return (
      <WrapperComponent
        isSelected={isSelected}
        style={styles.accountItem}
        onPress={handlePress}
        activeOpacity={0.7}
        testID="list-item-select"
      >
        <AccountCell
          accountGroup={accountGroup}
          avatarAccountType={avatarAccountType}
          isSelected={isSelected}
        />
      </WrapperComponent>
    );
  },
);

AccountListCell.displayName = 'AccountListCell';

export default React.memo(AccountListCell);
