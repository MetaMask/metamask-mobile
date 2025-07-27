import { Hex } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';

import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './to.styles';

const To = () => {
  const { styles } = useStyles(styleSheet, {});
  const { to, updateTo } = useSendContext();

  return (
    <View>
      <Text>To:</Text>
      <Input
        style={styles.input}
        onChangeText={(toAddr: string) => {
          updateTo(toAddr as Hex);
        }}
        value={to}
        testID="send_to_address"
      />
    </View>
  );
};

export default To;
