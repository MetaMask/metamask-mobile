import React from 'react';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './ConfirmationFooter.styles';
import { View } from 'react-native';
import FooterLegalLinks from './LegalLinks/LegalLinks';
import FooterButtonGroup from './FooterButtonGroup/FooterButtonGroup';

const ConfirmationFooter = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.footerContainer}>
      <FooterLegalLinks />
      <FooterButtonGroup />
    </View>
  );
};

export default ConfirmationFooter;
