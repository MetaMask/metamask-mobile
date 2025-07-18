import { AccountGroup } from '@metamask/account-tree-controller';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './AccountCell.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { AccountCellIds } from '../../../../../e2e/selectors/MultichainAccounts/AccountCell.selectors';

interface AccountCellProps {
  accountGroup: AccountGroup;
  isSelected: boolean;
}

export const AccountCell = ({ accountGroup, isSelected }: AccountCellProps) => {
  const { styles } = useStyles(styleSheet, { isSelected });

  return (
    <Box
      style={styles.container}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.flexStart}
      alignItems={AlignItems.center}
      testID={AccountCellIds.CONTAINER}
    >
      <View style={styles.avatar} testID={AccountCellIds.AVATAR}></View>
      <Text
        variant={TextVariant.BodyMDBold}
        color={TextColor.Default}
        testID={AccountCellIds.ADDRESS}
      >
        {accountGroup.metadata.name}
      </Text>
      <Text
        variant={TextVariant.BodyMDBold}
        color={TextColor.Muted}
        testID={AccountCellIds.BALANCE}
      >
        {
          // TODO: REPLACE WITH ACTUAL BALANCE
          '$1234567890.00'
        }
        {`${isSelected}`}
      </Text>
      <TouchableOpacity
        style={styles.accountDetailsMenu}
        testID={AccountCellIds.MENU}
      >
        <Icon
          name={IconName.MoreVertical}
          size={IconSize.Md}
          color={TextColor.Muted}
        />
      </TouchableOpacity>
    </Box>
  );
};
