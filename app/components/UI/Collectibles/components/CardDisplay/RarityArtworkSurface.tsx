import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { Box } from '@metamask/design-system-react-native';
import type { CollectiblesInventoryCard } from '../../types';
import { RARITY_COLORS } from '../RarityTag/RarityTag.constants';

/** Replit RarityArtworkSurface: the tinted surface surrounds artwork, not its labels. */
export default function RarityArtworkSurface({
  rarity,
  children,
}: {
  rarity?: CollectiblesInventoryCard['rarity'];
  children: React.ReactNode;
}) {
  const tw = useTailwind();
  return (
    <Box
      padding={3}
      twClassName="w-full overflow-hidden rounded-xl border border-muted bg-muted"
    >
      {rarity && (
        <Box
          pointerEvents="none"
          accessible
          accessibilityLabel={strings(`collectibles.rarity.${rarity}`)}
          twClassName="absolute inset-0"
          style={tw.style({
            backgroundColor: RARITY_COLORS[rarity],
            opacity: rarity === 'common' ? 0.12 : 0.3,
          })}
        />
      )}
      {children}
    </Box>
  );
}
