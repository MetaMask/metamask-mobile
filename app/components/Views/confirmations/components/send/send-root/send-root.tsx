import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../../component-library/components/Texts/Text';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendActions } from '../../../hooks/send/useSendActions';
import { useSendDisabled } from '../../../hooks/send/useSendDisabled';
import { Amount } from '../amount';
import { Asset } from '../asset';
import { SendTo } from '../send-to';
import { styleSheet } from './send-root.styles';

export const SendRoot = () => {
  const from = useSelector(selectSelectedInternalAccount);
  const { styles } = useStyles(styleSheet, {});
  const { handleCancelPress, handleSubmitPress } = useSendActions();
  const { sendDisabled } = useSendDisabled();
  useRouteParams();

  return (
    <View style={styles.container}>
      <Asset />
      <View>
        <Text>From:</Text>
        <Text>{from?.address}</Text>
      </View>
      <SendTo />
      <Amount />
      <Button
        label="Cancel"
        onPress={handleCancelPress}
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
      />
      <Button
        label="Confirm"
        disabled={sendDisabled}
        onPress={handleSubmitPress}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
      />
    </View>
  );
};
