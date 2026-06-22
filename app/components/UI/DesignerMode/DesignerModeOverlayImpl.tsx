import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { DesignerModeRN } from './DesignerModeRN';
import { getDefaultRelayUrl } from './relayUrl';

// Fixed dev-tooling chrome; expressed as rgb() (not hex) and centralized so the
// stylesheet never embeds color literals. MetaMask brand blue.
const FAB_BG = 'rgb(3, 125, 214)';
const FAB_SHADOW = 'rgb(0, 0, 0)';

const styles = StyleSheet.create({
  // Sits above the bottom tab bar, out of the way of most app chrome.
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: FAB_BG,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: FAB_SHADOW,
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

export default DesignerModeOverlayImpl;
