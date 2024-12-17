import React from 'react';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './ConfirmationFooter.styles';
import { View } from 'react-native';
import FooterLegalLinks from './LegalLinks/LegalLinks';
import FooterButtonGroup from './FooterButtonGroup/FooterButtonGroup';
import { ConfirmationFooterProps } from './ConfirmationFooter.types';

const ConfirmationFooter = ({ valueWei, action }: ConfirmationFooterProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.footerContainer}>
      <FooterLegalLinks />
      <FooterButtonGroup valueWei={valueWei} action={action} />
    </View>
  );
};

export default ConfirmationFooter;
