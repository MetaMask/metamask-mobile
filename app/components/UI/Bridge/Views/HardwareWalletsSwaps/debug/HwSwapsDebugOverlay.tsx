/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxFlexWrap,
  Button,
  ButtonVariant,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useHwSwapsDebug } from './HwSwapsDebugContext';
import { HW_SWAPS_DEBUG_SNAPSHOTS } from './HwSwapsDebugSnapshots';

const styles = StyleSheet.create({
  collapsed: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 100,
  },
  expanded: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

export function HwSwapsDebugOverlay() {
  const { isDebugOverlayEnabled, setDebugState } = useHwSwapsDebug();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isDebugOverlayEnabled) return null;

  if (isCollapsed) {
    return (
      <Box style={styles.collapsed}>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          onPress={() => setIsCollapsed(false)}
        >
          DBG
        </Button>
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      flexWrap={BoxFlexWrap.Wrap}
      gap={1}
      padding={2}
      style={styles.expanded}
    >
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonBaseSize.Sm}
        onPress={() => {
          setIsCollapsed(true);
          setDebugState(null);
        }}
      >
        X
      </Button>
      {HW_SWAPS_DEBUG_SNAPSHOTS.map((snapshot) => (
        <Button
          key={snapshot.label}
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          onPress={() => setDebugState(snapshot.state)}
        >
          {snapshot.label}
        </Button>
      ))}
    </Box>
  );
}
