import { AccountGroupObject } from '@metamask/account-tree-controller';
import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../hooks';
import styleSheet from './AccountCell.styles';
import Text, { TextColor, TextVariant } from '../../../components/Texts/Text';
import { Box } from '../../../../components/UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../components/UI/Box/box.types';
import Icon, { IconName, IconSize } from '../../../components/Icons/Icon';
import { AccountCellIds } from '../../../../../e2e/selectors/MultichainAccounts/AccountCell.selectors';
import { selectBalanceByAccountGroup } from '../../../../selectors/assets/balances';
import Routes from '../../../../constants/navigation/Routes';

interface AccountCellProps {
  accountGroup: AccountGroupObject;
  isSelected: boolean;
}

const AccountCell = ({ accountGroup, isSelected }: AccountCellProps) => {
  const { styles } = useStyles(styleSheet, { isSelected });
  const { navigate } = useNavigation();

  const handleMenuPress = useCallback(() => {
    navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_CELL_ACTIONS, {
      accountGroup,
    });
  }, [navigate, accountGroup]);

  const selectBalanceForGroup = useMemo(
    () => selectBalanceByAccountGroup(accountGroup.id),
    [accountGroup.id],
  );
  const groupBalance = useSelector(selectBalanceForGroup);
  const displayBalance = groupBalance?.formattedTotalBalanceInUserCurrency;

  return (
    <Box
      style={styles.container}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.flexStart}
      alignItems={AlignItems.center}
      testID={AccountCellIds.CONTAINER}
    >
      <View style={styles.avatar} testID={AccountCellIds.AVATAR}></View>
      <View style={styles.accountName}>
        <Text
          variant={TextVariant.BodyMDBold}
          color={TextColor.Default}
          numberOfLines={1}
          style={styles.accountNameText}
          testID={AccountCellIds.ADDRESS}
        >
          {accountGroup.metadata.name}
        </Text>
        {isSelected && (
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Md}
            color={TextColor.Primary}
          />
        )}
      </View>
      <View style={styles.endContainer}>
        <Text
          variant={TextVariant.BodyMDBold}
          color={TextColor.Default}
          testID={AccountCellIds.BALANCE}
        >
          {displayBalance}
        </Text>
        <TouchableOpacity
          testID={AccountCellIds.MENU}
          style={styles.menuButton}
          onPress={handleMenuPress}
        >
          <Icon
            name={IconName.MoreVertical}
            size={IconSize.Md}
            color={TextColor.Alternative}
          />
        </TouchableOpacity>
      </View>
    </Box>
  );
};

export default React.memo(AccountCell);
