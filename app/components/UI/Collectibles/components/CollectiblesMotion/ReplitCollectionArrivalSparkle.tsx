import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import CollectiblesMotion from './CollectiblesMotion';

/** Mount when the confirmed collection amount starts counting, after Replit's 350ms delay. */
export default function ReplitCollectionArrivalSparkle({
  identity,
  onComplete,
  isActive = true,
}: {
  identity: string;
  onComplete: () => void;
  isActive?: boolean;
}) {
  return (
    <Box pointerEvents="none" accessible={false} twClassName="absolute inset-0">
      <CollectiblesMotion
        key={identity}
        configuration={{
          kind: 'collectionArrival',
          identity,
          name: '',
          front: '',
        }}
        isActive={isActive}
        onCompleted={onComplete}
        onError={onComplete}
        testID="collectibles-collection-arrival-sparkle"
      />
    </Box>
  );
}
