import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import StyledButton from '../../../../../../components/UI/StyledButton';
import { useTheme } from '../../../../../../util/theme';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import createStyles from './style';

const Footer = () => {
  const { onConfirm, onReject } = useApprovalRequest();
  const { colors } = useTheme();

  const styles = createStyles(colors);

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
