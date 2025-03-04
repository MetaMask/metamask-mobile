import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import ScreenView from '../../Base/ScreenView';
import Text from '../../../component-library/components/Texts/Text';

const createStyles = () =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });

const BridgeView = () => {
  const styles = createStyles();

  return (
    <ScreenView>
      <View style={styles.content}>
        <Text>Bridge</Text>
      </View>
    </ScreenView>
  );
};

export default BridgeView;
