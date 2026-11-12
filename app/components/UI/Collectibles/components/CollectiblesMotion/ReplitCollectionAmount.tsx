import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import CollectiblesMotion from './CollectiblesMotion';

/** Replit NumberFlow transition, with confirmed totals converted by the native host. */
export default function ReplitCollectionAmount({
  identity,
  from,
  to,
  currency,
  delay = 350,
  locale,
  textColor,
  onComplete,
  onError,
  isActive = true,
}: {
  identity: string;
  from: number;
  to: number;
  currency: string;
  delay?: number;
  locale?: string;
  textColor?: string;
  onComplete?: () => void;
  onError?: () => void;
  isActive?: boolean;
}) {
  return (
    <Box pointerEvents="none" accessible={false} twClassName="h-11 w-full">
      <CollectiblesMotion
        key={identity}
        configuration={{
          kind: 'collectionAmount',
          identity,
          name: '',
          front: '',
          amount: { from, to, currency, delay, locale, textColor },
        }}
        isActive={isActive}
        onCompleted={onComplete}
        onError={onError ?? onComplete}
        testID="collectibles-collection-amount"
      />
    </Box>
  );
}
