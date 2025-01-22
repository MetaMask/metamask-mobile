import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import StyledButton from '../../../../../../components/UI/StyledButton';
import { useStyles } from '../../../../../../component-library/hooks';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import styleSheet from './Footer.styles';

const Footer = () => {
  const { onConfirm, onReject } = useConfirmActions();
  const { approvalRequest } = useApprovalRequest();
  const securityAlertResponse =
    approvalRequest?.requestData?.securityAlertResponse;
  const { styles } = useStyles(styleSheet, {
    hasError: securityAlertResponse !== undefined,
  });

  return (
    <View style={styles.buttonsContainer}>
      <StyledButton
        onPress={onReject}
        containerStyle={styles.rejectButton}
        type={'normal'}
      >
        {strings('confirm.reject')}
      </StyledButton>
      <View style={styles.buttonDivider} />
      <StyledButton
        onPress={onConfirm}
        containerStyle={styles.confirmButton}
        type={'confirm'}
      >
        {strings('confirm.confirm')}
      </StyledButton>
    </View>
  );
};

export default Footer;
