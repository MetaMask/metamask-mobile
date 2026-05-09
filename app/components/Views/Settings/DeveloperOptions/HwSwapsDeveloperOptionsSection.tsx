import React from 'react';
import { Switch, View, StyleSheet } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useHwSwapsDebug } from '../../../UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugContext';

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 8,
  },
  heading: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});

export const HwSwapsDeveloperOptionsSection = () => {
  const { isDebugOverlayEnabled, setDebugOverlayEnabled } = useHwSwapsDebug();

  return (
    <View style={styles.container}>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        HW Swaps Debug
      </Text>
      <View style={styles.row}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          Show state overlay on HW Swaps screen
        </Text>
        <Switch
          value={isDebugOverlayEnabled}
          onValueChange={setDebugOverlayEnabled}
        />
      </View>
    </View>
  );
};
