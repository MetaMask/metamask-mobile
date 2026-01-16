import React, { useCallback } from 'react';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useNavigation } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../AccountGroupDetails.styles';

export interface RemoveAccountProps {
  account: InternalAccount;
}

export const RemoveAccount = ({ account }: RemoveAccountProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
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
      <Text style={styles.removeAccountText} variant={TextVariant.BodyMDMedium}>
        {strings('multichain_accounts.account_details.remove_account')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={colors.text.alternative}
        />
      </Box>
    </TouchableOpacity>
  );
};
