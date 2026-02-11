import React, { useCallback } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { strings } from '../../../../../locales/i18n';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import { Box } from '../../../UI/Box/Box';
import styleSheet from './AccountConnectCreateInitialAccount.styles';
import { useStyles } from '../../../../component-library/hooks';
import { AccountConnectSelectorsIDs } from '../AccountConnect.testIds';

interface AccountConnectCreateInitialAccountProps {
  onCreateAccount: () => void;
}

export const AccountConnectCreateInitialAccount = ({
  onCreateAccount,
}: AccountConnectCreateInitialAccountProps) => {
  const { styles } = useStyles(styleSheet, {});

  const handleAccountCreation = useCallback(() => {
    onCreateAccount();
  }, [onCreateAccount]);

  return (
    <Box
      style={styles.container}
      gap={8}
      flexDirection={FlexDirection.Column}
      justifyContent={JustifyContent.center}
      alignItems={AlignItems.center}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {strings('accounts.account_connect_create_initial_account.description')}
      </Text>
      <ButtonLink
        testID={AccountConnectSelectorsIDs.CREATE_ACCOUNT_BUTTON}
        style={styles.button}
        label={strings(
          'accounts.account_connect_create_initial_account.button',
        )}
        onPress={handleAccountCreation}
      />
    </Box>
  );
};
