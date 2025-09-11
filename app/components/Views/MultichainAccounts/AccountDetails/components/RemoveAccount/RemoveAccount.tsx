import React, { useCallback } from 'react';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './RemoveAccount.styles';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';

interface RemoveAccountProps {
  account: InternalAccount;
}

export const RemoveAccount = ({ account }: RemoveAccountProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const handleRemoveAccountClick = useCallback(() => {
    navigate(Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT, {
      account,
    });
  }, [account, navigate]);

  return (
    <Button
      testID={AccountDetailsIds.REMOVE_ACCOUNT_BUTTON}
      style={styles.button}
      isDanger
      variant={ButtonVariants.Secondary}
      labelTextVariant={TextVariant.BodyMDMedium}
      onPress={handleRemoveAccountClick}
      label={strings('multichain_accounts.delete_account.title')}
    />
  );
};
