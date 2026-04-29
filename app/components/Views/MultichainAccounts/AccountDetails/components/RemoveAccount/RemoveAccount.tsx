import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './RemoveAccount.styles';
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
import { AccountDetailsIds } from '../../../AccountDetails.testIds';

interface RemoveAccountProps {
  account: InternalAccount;
}

export const RemoveAccount = ({ account }: RemoveAccountProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const handleRemoveAccountClick = useCallback(() => {
    navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
      screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
      params: { account },
    });
  }, [account, navigate]);

  return (
    <Button
      testID={AccountDetailsIds.REMOVE_ACCOUNT_BUTTON}
      style={styles.button}
      isDanger
      variant={ButtonVariant.Secondary}
      onPress={handleRemoveAccountClick}
    >
      {strings('multichain_accounts.delete_account.title')}
    </Button>
  );
};
