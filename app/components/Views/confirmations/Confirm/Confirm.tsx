import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../util/theme';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import Title from '../components/Confirm/Title';
import useConfirmationRedesignEnabled from '../hooks/useConfirmationRedesignEnabled';
import createStyles from './style';

const Confirm = () => {
  const { colors } = useTheme();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  if (!isRedesignedEnabled) {
    return null;
  }

  const styles = createStyles(colors);

  return (
    <BottomModal>
      <View style={styles.container}>
        <View>
          <Title />
        <Info />
        </View>
        <Footer />
      </View>
    </BottomModal>
  );
};

export default Confirm;
