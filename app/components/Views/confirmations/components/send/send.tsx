import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../component-library/components/Texts/Text';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useStyles } from '../../../../hooks/useStyles';
import { useSendContext } from '../../context/send-context';
import Amount from './amount';
import Asset from './asset';
import To from './to';
import styleSheet from './send.styles';

export const Send = () => {
  const from = useSelector(selectSelectedInternalAccount);
  const { styles } = useStyles(styleSheet, {});
  const { cancelSend, submitSend } = useSendContext();

  return (
    <View style={styles.container}>
      <Asset />
      <View>
        <Text>From:</Text>
        <Text>{from?.address}</Text>
      </View>
      <To />
      <Amount />
      <Button
        label="Cancel"
        onPress={cancelSend}
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
      />
      <Button
        label="Confirm"
        onPress={submitSend}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
      />
    </View>
  );
};
