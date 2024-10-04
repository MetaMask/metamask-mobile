import React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Title from '../components/Confirm/Title';
import useConfirmationRedesignEnabled from '../hooks/useConfirmationRedesignEnabled';
import styleSheet from './Confirm.styles';

const Confirm = () => {
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  return (
    <BottomModal>
      <View style={styles.container}>
        <Title />
        <Footer />
      </View>
    </BottomModal>
  );
};

export default Confirm;
