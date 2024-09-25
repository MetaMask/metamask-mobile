import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useAlerts } from '../../../context/Alerts';

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
  const { alerts, showAlertModal } = useAlerts();
  const { onReject, onConfirm } = useApprovalRequest();

  const onSignConfirm = useCallback(async () => {
    if (alerts.length > 0) {
      showAlertModal();
      return;
    }
    await onConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
  }, [onConfirm, showAlertModal, alerts]);

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
        isDanger={alerts.length > 0}
      />
    </View>
  );
};

export default Footer;
