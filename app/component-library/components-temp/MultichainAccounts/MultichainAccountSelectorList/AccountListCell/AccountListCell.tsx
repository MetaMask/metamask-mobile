import React, { memo, useCallback } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../hooks';
import AccountCell from '../../AccountCell';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListCellProps } from './AccountListCell.types';
import Checkbox from '../../../../components/Checkbox';
import { ACCOUNT_LIST_CELL_TEST_IDS } from './AccountListCell.testIds';

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
                <View
                  testID={`${ACCOUNT_LIST_CELL_TEST_IDS.ACCOUNT_LIST_CELL}${accountGroup.id}`}
                >
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
