import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import { getCardSummaryHeight } from '../CardDisplay/CardSummary';

/** Match CardTile's artwork and reserved metadata space, including the home preview. */
export default function CardTileSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <Box twClassName="w-full">
      <Box padding={3} twClassName="rounded-xl border border-muted bg-muted">
        <Skeleton
          height={compact ? 160 : undefined}
          style={compact ? undefined : { aspectRatio: 2 / 3 }}
          twClassName="w-full rounded-2xl"
        />
      </Box>
      <Box
        gap={1}
        paddingTop={2}
        style={{ height: getCardSummaryHeight(fontScale) }}
      >
        <Skeleton height={16} width="80%" />
        <Skeleton height={14} width="50%" />
      </Box>
    </Box>
  );
}
