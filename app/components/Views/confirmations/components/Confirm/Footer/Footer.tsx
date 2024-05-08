import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import useApprovalRequest from '../../../hooks/useApprovalRequest';

const styles = StyleSheet.create({
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: 16,
  },
  button: {
    flex: 1,
  },
  buttonDivider: {
    width: 8,
  },
});

const Footer = () => {
  const { onReject, onConfirm } = useApprovalRequest();

  const onSignConfirm = useCallback(async () => {
    await onConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
  }, [onConfirm]);

  return (
    <View style={styles.buttonContainer}>
      <Button
        variant={ButtonVariants.Secondary}
        onPress={onReject}
        label={strings('confirmation_modal.cancel_cta')}
        size={ButtonSize.Lg}
        style={styles.button}
      />
      <View style={styles.buttonDivider} />
      <Button
        variant={ButtonVariants.Primary}
        onPress={onSignConfirm}
        label={strings('confirmation_modal.confirm_cta')}
        size={ButtonSize.Lg}
        style={styles.button}
      />
    </View>
  );
};

export default Footer;
