import { Hex } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';

import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useSendContext } from '../../../context/send-context';
import { useToAddressValidation } from '../../../hooks/send/useToAddressValidation';
import { styleSheet } from './send-to.styles';

export const SendTo = () => {
  const { styles } = useStyles(styleSheet, {});
  const { to, updateTo } = useSendContext();
  const { toAddressError, toAddressWarning } = useToAddressValidation();

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
      <Text color={TextColor.Error}>{toAddressError}</Text>
      <Text color={TextColor.Warning}>{toAddressWarning}</Text>
    </View>
  );
};
