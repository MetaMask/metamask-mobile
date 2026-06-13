/* eslint-disable @metamask/design-tokens/color-no-hex, react-native/no-color-literals, @typescript-eslint/no-use-before-define -- Designer Mode dev-tooling FAB: DESIGNER_MODE-gated, never shipped to production. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { DesignerModeRN } from './DesignerModeRN';
import { getDefaultRelayUrl } from './relayUrl';

/**
 * The actual Designer Mode overlay: a floating toggle (FAB) plus the inspector
 * panel. This module is only ever `require`d when `DESIGNER_MODE=true` (see
 * `DesignerModeOverlay.tsx`), so importing the inspector here — and the
 * `StyleSheet.create` patch it pulls in via `fiber.ts` — never runs in normal
 * builds.
 */
const DesignerModeOverlayImpl: React.FC = () => {
  const [active, setActive] = useState(false);
  const [relayUrl] = useState(getDefaultRelayUrl);

  return (
    <>
      {!active && (
        <Pressable
          onPress={() => setActive(true)}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Open Designer Mode"
        >
          <Text style={styles.fabText}>🎨</Text>
        </Pressable>
      )}
      <DesignerModeRN
        active={active}
        onClose={() => setActive(false)}
        relayUrl={relayUrl}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Sits above the bottom tab bar, out of the way of most app chrome.
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 9999,
  } as ViewStyle,
  fabText: {
    fontSize: 24,
  },
});

export default DesignerModeOverlayImpl;
