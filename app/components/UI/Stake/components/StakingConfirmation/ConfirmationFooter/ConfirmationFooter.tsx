import React from 'react';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './ConfirmationFooter.styles';
import { View } from 'react-native';
import FooterLegalLinks from './LegalLinks/LegalLinks';
import FooterButtonGroup from './FooterButtonGroup/FooterButtonGroup';

interface ConfirmationFooterProps {
  value: string; // deposit, unstake, and claim value
}

const ConfirmationFooter = ({ value }: ConfirmationFooterProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.footerContainer}>
      <FooterLegalLinks />
      <FooterButtonGroup value={value} />
    </View>
  );
};

export default ConfirmationFooter;
