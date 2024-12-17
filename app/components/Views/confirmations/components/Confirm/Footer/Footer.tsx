import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import StyledButton from '../../../../../../components/UI/StyledButton';
import { useStyles } from '../../../../../../component-library/hooks';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import styleSheet from './Footer.styles';

const Footer = () => {
  const { onConfirm, onReject } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

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
