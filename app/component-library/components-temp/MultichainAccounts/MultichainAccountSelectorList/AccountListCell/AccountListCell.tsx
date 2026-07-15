import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@metamask/design-system-react-native';

import { useStyles } from '../../../../hooks';
import AccountCell from '../../AccountCell';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListCellProps } from './AccountListCell.types';
import {
  ACCOUNT_LIST_CELL_CHECKBOX_ICON_TEST_ID,
  ACCOUNT_LIST_CELL_TEST_IDS,
} from './AccountListCell.testIds';

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
                <View>
                  <Checkbox
                    testID={`${ACCOUNT_LIST_CELL_TEST_IDS.ACCOUNT_LIST_CELL}${accountGroup.id}`}
                    isSelected={isSelected}
                    onChange={handlePress}
                    checkedIconProps={
                      isSelected
                        ? { testID: ACCOUNT_LIST_CELL_CHECKBOX_ICON_TEST_ID }
                        : undefined
                    }
                  />
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
