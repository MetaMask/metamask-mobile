import React, { useCallback } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../hooks/useStyles';
import { useAmountValidation } from '../../../hooks/send/useAmountValidation';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendScreenNavigation } from '../../../hooks/send/useSendScreenNavigation';
import { AmountEdit } from './amount-edit';
import { styleSheet } from './amount.styles';

export const Amount = () => {
  const { gotToSendScreen } = useSendScreenNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { invalidAmount, insufficientBalance } = useAmountValidation();
  useRouteParams();

  const goToNextPage = useCallback(() => {
    gotToSendScreen(Routes.SEND.RECIPIENT);
  }, [gotToSendScreen]);

  return (
    <View style={styles.container}>
      <AmountEdit />
      {!invalidAmount && (
        <Button
          label={
            insufficientBalance
              ? strings('send.amount_insufficient')
              : strings('send.continue')
          }
          onPress={goToNextPage}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
        />
      )}
    </View>
  );
};
