import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import ScreenView from '../../Base/ScreenView';

const createStyles = (colors: ThemeColors) =>
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
      </View>
    </ScreenView>
  );
};

export default BridgeView;
