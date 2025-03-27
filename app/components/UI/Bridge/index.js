import React from 'react';
import { StyleSheet, View } from 'react-native';
import ScreenView from '../../Base/ScreenView';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';

const createStyles = (colors) =>
  StyleSheet.create({
    container: { backgroundColor: colors.background.default },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });

const BridgeView = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScreenView
      style={styles.container}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text>Bridge</Text>
      </View>
    </ScreenView>
  );
};

export default BridgeView;
