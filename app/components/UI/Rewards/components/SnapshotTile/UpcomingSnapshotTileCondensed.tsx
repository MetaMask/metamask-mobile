import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { SnapshotDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getSnapshotStatusInfo } from './SnapshotTile.utils';

interface UpcomingSnapshotTileCondensedProps {
  /**
   * The snapshot data to display
   */
  snapshot: SnapshotDto;
}

/**
 * UpcomingSnapshotTileCondensed component displays a condensed view of upcoming snapshots.
 *
 * Returns null if the snapshot is not in "upcoming" status.
 *
 * Shows:
 * - Status pill with icon
 * - Prize name
 * - Status label with date
 */
const UpcomingSnapshotTileCondensed: React.FC<
  UpcomingSnapshotTileCondensedProps
> = ({ snapshot }) => {
  const { status, statusDescription } = useMemo(
    () => getSnapshotStatusInfo(snapshot),
    [snapshot],
  );

  // Return null if not upcoming
  if (status !== 'upcoming') {
    return null;
  }

  // Format prize display
  const prizeDisplay = snapshot.name;

  return (
    <Box twClassName="rounded-lg overflow-hidden relative bg-background-section p-4">
      {/* Content */}
      <Box flexDirection={BoxFlexDirection.Column}>
        <Text variant={TextVariant.BodyMd} twClassName="text-default">
          {prizeDisplay}
        </Text>

        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {statusDescription}
        </Text>
      </Box>
    </Box>
  );
};

export default UpcomingSnapshotTileCondensed;
