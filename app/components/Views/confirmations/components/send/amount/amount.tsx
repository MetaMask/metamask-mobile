import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../../constants/navigation/Routes';
import Text from '../../../../../../component-library/components/Texts/Text';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendContext } from '../../../context/send-context';
import { useSendAmountConfirmDisabled } from '../../../hooks/send/useSendAmountConfirmDisabled';
import { useSendScreenNavigation } from '../../../hooks/send/useSendScreenNavigation';
import { AmountEdit } from './amount-edit';
import { styleSheet } from './amount.styles';

export const Amount = () => {
  const { gotToSendScreen } = useSendScreenNavigation();
  const from = useSelector(selectSelectedInternalAccount);
  const { styles } = useStyles(styleSheet, {});
  const { asset } = useSendContext();
  const { isDisabled } = useSendAmountConfirmDisabled();
  useRouteParams();

  const goToNextPage = useCallback(() => {
    gotToSendScreen(Routes.SEND.RECIPIENT);
  }, [gotToSendScreen]);

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.address ?? 'NA'}</Text>
      <View>
        <Text>From:</Text>
        <Text>{from?.address}</Text>
      </View>
      <AmountEdit />
      <Button
        label="Continue"
        disabled={isDisabled}
        onPress={goToNextPage}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
      />
    </View>
  );
};
