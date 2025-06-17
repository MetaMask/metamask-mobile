import React, { useState } from 'react';
import { SeedPhraseGrid } from './SeedPhraseGrid';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SeedPhraseRevealProps {
  seedPhrase: string[];
}

const OVERLAY_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.8)';
const OVERLAY_TEXT_COLOR = '#FFFFFF';
const OVERLAY_SUBTEXT_COLOR = '#CCCCCC';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: OVERLAY_BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  overlayContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayText: {
    color: OVERLAY_TEXT_COLOR,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  overlaySubtext: {
    color: OVERLAY_SUBTEXT_COLOR,
    fontSize: 14,
    textAlign: 'center',
  },
});

export const SeedPhraseReveal = ({ seedPhrase }: SeedPhraseRevealProps) => {
  const [seedPhraseRevealClicked, setSeedPhraseRevealClicked] = useState(false);

  const handleRevealPress = () => {
    setSeedPhraseRevealClicked(true);
  };

  return (
    <View style={styles.container}>
      <SeedPhraseGrid
        seedPhrase={seedPhrase}
        setSeedPhrase={() => {
          // No-op for read-only display
        }}
        isEditable={false}
        canShowSeedPhraseWord={() => true}
      />
      {!seedPhraseRevealClicked && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={handleRevealPress}
          activeOpacity={0.8}
        >
          <View style={styles.overlayContent}>
            <Text style={styles.overlayText}>
              Tap to reveal your Secret Recovery Phrase
            </Text>
            <Text style={styles.overlaySubtext}>
              Make sure no one is looking at your screen
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};
