import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import ScreenView from '../../Base/ScreenView';

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
      <View style={styles.content} testID="bridge-view">
      </View>
    </ScreenView>
  );
};

export default BridgeView;
