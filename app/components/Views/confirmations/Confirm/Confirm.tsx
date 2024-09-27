import React from 'react';
import { Text, View } from 'react-native';

import BottomModal from '../../../../components/UI/BottomModal';
import { useTheme } from '../../../../util/theme';
import Footer from '../components/Confirm/Footer';
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
        <Text>TODO</Text>
        <Footer />
      </View>
    </BottomModal>
  );
};

export default Confirm;
