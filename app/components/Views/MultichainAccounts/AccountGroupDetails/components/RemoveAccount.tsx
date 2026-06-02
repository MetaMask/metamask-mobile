import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../AccountGroupDetails.styles';

export interface RemoveAccountProps {
  account: InternalAccount;
}

export const RemoveAccount = ({ account }: RemoveAccountProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const handleRemoveAccountClick = useCallback(() => {
    navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
      screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
      params: { account },
    });
  }, [account, navigation]);

  return (
    <TouchableOpacity
      style={styles.removeAccount}
      testID={AccountDetailsIds.REMOVE_ACCOUNT_BUTTON}
      onPress={handleRemoveAccountClick}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.ErrorDefault}
      >
        {strings('multichain_accounts.account_details.remove_account')}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={8}
      >
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>
    </TouchableOpacity>
  );
};
