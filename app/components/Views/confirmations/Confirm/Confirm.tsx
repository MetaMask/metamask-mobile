import React from 'react';
import { Text, View } from 'react-native';

import BottomModal from '../../../../components/UI/BottomModal';
import { useTheme } from '../../../../util/theme';
import useRedesignEnabled from '../hooks/useRedesignEnabled';
import createStyles from './style';

const Confirm = () => {
  const { colors } = useTheme();
  const { isRedesignedEnabled } = useRedesignEnabled();

  if (!isRedesignedEnabled) {
    return null;
  }

  const styles = createStyles(colors);

  return (
    <BottomModal>
      <View style={styles.container}>
        <Text>TODO</Text>
      </View>
    </BottomModal>
  );
};

export default Confirm;
