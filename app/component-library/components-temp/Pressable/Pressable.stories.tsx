import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../util/theme';

import Pressable from './Pressable';
import type { PressableVariant } from './Pressable.types';

const styles = StyleSheet.create({
  row: { padding: 16, borderRadius: 8 },
  stack: { gap: 12 },
});

const variants: PressableVariant[] = [
  'section',
  'subsection',
  'default',
  'muted',
  'transparent',
  'none',
];

const PressableMeta = {
  title: 'Components Temp / Pressable',
  component: Pressable,
  argTypes: {
    variant: {
      control: 'select',
      options: variants,
    },
  },
  args: {
    variant: 'section' as PressableVariant,
    onPress: () => {
      // demo only
    },
  },
};

export default PressableMeta;

const ThemedText = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return <Text style={{ color: colors.text.default }}>{children}</Text>;
};

export const Default = {
  render: (args: { variant: PressableVariant; onPress: () => void }) => (
    <Pressable {...args} style={styles.row}>
      <ThemedText>Press me</ThemedText>
    </Pressable>
  ),
};

export const AllVariants = {
  render: () => (
    <View style={styles.stack}>
      {variants.map((v) => (
        <Pressable
          key={v}
          variant={v}
          onPress={() => undefined}
          style={styles.row}
        >
          <ThemedText>{v}</ThemedText>
        </Pressable>
      ))}
    </View>
  ),
};
