import React, { useCallback } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Input from '../../../../../component-library/components/Form/TextField/foundation/Input';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './send.styles';

interface Asset {
  name: string;
}

const Send = () => {
  const route = useRoute<RouteProp<Record<string, { asset: Asset }>, string>>();
  const { asset } = route?.params ?? {};
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const submitSend = useCallback(() => {
    // actual confirmation creation to come here
    navigation.goBack();
  }, [navigation]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.name ?? 'NA'}</Text>
      <View>
        <Text>From:</Text>
        <Input style={styles.input} />
      </View>
      <View>
        <Text>To:</Text>
        <Input style={styles.input} />
      </View>
      <View>
        <Text>Amount:</Text>
        <Input style={styles.input} />
      </View>
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

export default Send;
