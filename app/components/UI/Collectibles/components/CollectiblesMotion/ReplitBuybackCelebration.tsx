import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import CollectiblesMotion from './CollectiblesMotion';

export interface BuybackCelebrationPoint {
  x: number;
  y: number;
}

/** Source Replit coin flight. Call only after a confirmed sale, with measured local centers. */
export default function ReplitBuybackCelebration({
  identity,
  source,
  target,
  onComplete,
  isActive = true,
}: {
  identity: string;
  source: BuybackCelebrationPoint;
  target: BuybackCelebrationPoint;
  onComplete: () => void;
  isActive?: boolean;
}) {
  return (
    <Box pointerEvents="none" accessible={false} twClassName="absolute inset-0">
      <CollectiblesMotion
        key={identity}
        configuration={{
          kind: 'coins',
          identity,
          name: '',
          front: '',
          source,
          target,
        }}
        isActive={isActive}
        onCompleted={onComplete}
        onError={onComplete}
        testID="collectibles-buyback-celebration"
      />
    </Box>
  );
}
