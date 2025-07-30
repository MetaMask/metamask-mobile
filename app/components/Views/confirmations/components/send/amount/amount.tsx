import React from 'react';
import { View } from 'react-native';

import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './amount.styles';

const Amount = () => {
  const { styles } = useStyles(styleSheet, {});
  const { updateTransactionParams } = useSendContext();

  return (
    <View>
      <Text>Value:</Text>
      <Input
        style={styles.input}
        onChangeText={(value: string) => {
          updateTransactionParams({ value });
        }}
        testID="send_amount"
      />
    </View>
  );
};

export default Amount;
