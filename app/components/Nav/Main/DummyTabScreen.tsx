import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * SPIKE(TMCU-1277): extra views each dummy tab mounts on first visit.
 * 0 is the cheapest possible screen; ~3000 reproduces a heavy mount.
 */
export const DUMMY_TAB_SCREEN_WEIGHT = 0;

const ROWS = Array.from(
  { length: DUMMY_TAB_SCREEN_WEIGHT },
  (_, index) => index,
);

/**
 * SPIKE(TMCU-1277): stands in for a real tab so the floating tab bar's slide can
 * be judged with screen mount cost removed, or dialed back in via the weight.
 * Enabled by `DUMMY_TAB_SCREENS` in `MainNavigator`. Not for the real branch.
 */
const DummyTabScreen = () => {
  const { name } = useRoute();
  const tw = useTailwind();

  return (
    <ScrollView
      style={tw.style('flex-1 bg-default')}
      contentContainerStyle={tw.style('p-4 pb-32')}
    >
      <Text style={tw.style('text-2xl font-bold text-default')}>{name}</Text>
      <Text style={tw.style('mt-1 text-alternative')}>
        weight {DUMMY_TAB_SCREEN_WEIGHT}
      </Text>
      {ROWS.map((row) => (
        <View key={row} style={tw.style('mt-px h-1 rounded-full bg-muted')} />
      ))}
    </ScrollView>
  );
};

export default DummyTabScreen;
