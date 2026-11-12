import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import CollectiblesMotion from './CollectiblesMotion';
import type { CollectiblesMotionConfiguration } from './CollectiblesMotion.types';

export type ReplitCollectionTransferCard = NonNullable<
  CollectiblesMotionConfiguration['transfers']
>[number];

/** Persistent native host supplies actual artwork bounds before and after navigation. */
export default function ReplitCollectionTransfer({
  identity,
  cards,
  onComplete,
  onCardLanded,
  isActive = true,
}: {
  identity: string;
  cards: ReplitCollectionTransferCard[];
  onComplete: () => void;
  onCardLanded?: (id: string) => void;
  isActive?: boolean;
}) {
  return (
    <Box pointerEvents="none" accessible={false} twClassName="absolute inset-0">
      <CollectiblesMotion
        key={identity}
        configuration={{
          kind: 'collectionTransfer',
          identity,
          name: '',
          front: '',
          transfers: cards,
        }}
        isActive={isActive}
        onCompleted={onComplete}
        onCardLanded={onCardLanded}
        onError={onComplete}
        testID="collectibles-collection-transfer"
      />
    </Box>
  );
}
