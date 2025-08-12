import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { View } from 'react-native';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRecipientSelectionMetrics } from '../../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useSendActions } from '../../../hooks/send/useSendActions';
import { useSendContext } from '../../../context/send-context';
import { useToAddressValidation } from '../../../hooks/send/useToAddressValidation';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { styleSheet } from './send-to.styles';

export const SendTo = () => {
  const { styles } = useStyles(styleSheet, {});
  const { to, updateTo } = useSendContext();
  const { toAddressError, toAddressWarning } = useToAddressValidation();
  const { handleSubmitPress } = useSendActions();
  const {
    captureRecipientSelected,
    setRecipientInputMethodManual,
    setRecipientInputMethodPasted,
  } = useRecipientSelectionMetrics();
  useSendNavbar({ currentRoute: Routes.SEND.RECIPIENT });

  const onTextChange = useCallback(
    async (sendTo: string) => {
      updateTo(sendTo);
      const clipboardText = await Clipboard.getString();
      if (clipboardText === sendTo) {
        setRecipientInputMethodPasted();
      } else {
        setRecipientInputMethodManual();
      }
    },
    [setRecipientInputMethodManual, setRecipientInputMethodPasted, updateTo],
  );

  const onSubmit = useCallback(() => {
    handleSubmitPress();
    captureRecipientSelected();
  }, [handleSubmitPress, captureRecipientSelected]);

  return (
    <View>
      <Text>To:</Text>
      <Input
        style={styles.input}
        onChangeText={onTextChange}
        value={to}
        testID="send_to_address"
      />
      {toAddressError && <Text color={TextColor.Error}>{toAddressError}</Text>}
      {toAddressWarning && (
        <Text color={TextColor.Warning}>{toAddressWarning}</Text>
      )}
      <Button
        label="Continue"
        disabled={!to || Boolean(toAddressError)}
        onPress={onSubmit}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
      />
    </View>
  );
};
