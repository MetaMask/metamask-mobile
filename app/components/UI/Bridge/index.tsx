import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import ScreenView from '../../Base/ScreenView';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';
import { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });

const BridgeView = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScreenView>
      <View style={styles.content}>
        <Text>Bridge</Text>
      </View>
    </ScreenView>
  );
};

export default BridgeView;
