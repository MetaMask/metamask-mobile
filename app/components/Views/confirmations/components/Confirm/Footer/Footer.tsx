import React, { useCallback } from 'react';
import { View } from 'react-native';

import { ConfirmationFooterSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useSecurityAlertResponse } from '../../../hooks/useSecurityAlertResponse';
import { ResultType } from '../../BlockaidBanner/BlockaidBanner.types';
import styleSheet from './Footer.styles';
import { useAlerts } from '../../../context/Alerts';

const Footer = () => {
  const { alerts, showAlertModal } = useAlerts();
  const { onConfirm, onReject } = useConfirmActions();
  const { securityAlertResponse } = useSecurityAlertResponse();

  const onSignConfirm = useCallback(async () => {
    if (alerts.length > 0) {
      showAlertModal();
      return;
    }
    await onConfirm();
  }, [onConfirm, showAlertModal, alerts]);

  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.buttonsContainer}>
      <Button
        onPress={onReject}
        label={strings('confirm.reject')}
        style={styles.footerButton}
        size={ButtonSize.Lg}
        testID={ConfirmationFooterSelectorIDs.CANCEL_BUTTON}
        variant={ButtonVariants.Secondary}
        width={ButtonWidthTypes.Full}
      />
      <View style={styles.buttonDivider} />
      <Button
        onPress={onSignConfirm}
        label={strings('confirm.confirm')}
        style={styles.footerButton}
        size={ButtonSize.Lg}
        testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        isDanger={securityAlertResponse?.result_type === ResultType.Malicious || alerts.length > 0}
      />
    </View>
  );
};

export default Footer;
