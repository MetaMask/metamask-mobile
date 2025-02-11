import React, { useMemo } from 'react';
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
import { useLedgerContext } from '../../../context/LedgerContext';
import { useSecurityAlertResponse } from '../../../hooks/useSecurityAlertResponse';
import { useQRHardwareContext } from '../../../context/QRHardwareContext';
import { ResultType } from '../../BlockaidBanner/BlockaidBanner.types';
import styleSheet from './Footer.styles';

const Footer = () => {
  const { onConfirm, onReject } = useConfirmActions();
  const { isQRSigningInProgress, needsCameraPermission } =
    useQRHardwareContext();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const { isLedgerAccount } = useLedgerContext();
  const { styles } = useStyles(styleSheet, {});

  const confirmButtonLabel = useMemo(() => {
    if (isQRSigningInProgress) {
      return strings('confirm.qr_get_sign');
    }
    if (isLedgerAccount) {
      return strings('confirm.sign_with_ledger');
    }
    return strings('confirm.confirm');
  }, [isLedgerAccount, isQRSigningInProgress]);

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
        onPress={onConfirm}
        label={confirmButtonLabel}
        style={styles.footerButton}
        size={ButtonSize.Lg}
        testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        isDanger={securityAlertResponse?.result_type === ResultType.Malicious}
        disabled={needsCameraPermission}
      />
    </View>
  );
};

export default Footer;
