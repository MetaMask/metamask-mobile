import React from 'react';
import { View } from 'react-native';

import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import useMaxAmount from '../../../hooks/send/useMaxAmount';
import useValidations from '../../../hooks/send/useValidations';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './amount.styles';

const Amount = () => {
  const { styles } = useStyles(styleSheet, {});
  const { transactionParams, updateTransactionParams } = useSendContext();
  const { updateToMaxAmount } = useMaxAmount();
  const { amountError } = useValidations();

  return (
    <View>
      <Text>Value:</Text>
      <Input
        style={styles.input}
        value={transactionParams.value}
        onChangeText={(value: string) => {
          updateTransactionParams({ value });
        }}
        testID="send_amount"
      />
      <Text color={TextColor.Error}>{amountError}</Text>
      <Button
        label="Max"
        onPress={updateToMaxAmount}
        variant={ButtonVariants.Secondary}
      />
    </View>
  );
};

export default Amount;
