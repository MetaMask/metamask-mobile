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
    const showSelectedIndicator = isSelected && !showCheckbox;
    const { styles } = useStyles(createStyles, {
      isSelected,
    });

    const handlePress = useCallback(() => {
      onSelectAccount(accountGroup);
    }, [accountGroup, onSelectAccount]);

    return (
      <View accessibilityRole="none" accessible={false} style={styles.accountItem}>
        {showSelectedIndicator && <View accessibilityRole="none" accessible={false} style={styles.selectedIndicator} />}
        <View accessibilityRole="none" accessible={false} style={styles.accountCellWrapper}>
          <AccountCell
            startAccessory={
              showCheckbox ? (
                <View accessibilityRole="none" accessible={false} testID={`account-list-cell-checkbox-${accountGroup.id}`}>
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
