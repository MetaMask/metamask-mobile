import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getDropStatusInfo } from './DropTile.utils';

interface UpcomingDropTileCondensedProps {
  /**
   * The drop data to display
   */
  drop: SeasonDropDto;
}

/**
 * UpcomingDropTileCondensed component displays a condensed view of upcoming drops.
 *
 * Returns null if the drop is not in "upcoming" status.
 *
 * Shows:
 * - Status pill with icon
 * - Prize name
 * - Status label with date
 */
const UpcomingDropTileCondensed: React.FC<UpcomingDropTileCondensedProps> = ({
  drop,
}) => {
  const { status, statusDescription } = useMemo(
    () => getDropStatusInfo(drop),
    [drop],
  );

  // Return null if not upcoming
  if (status !== DropStatus.UPCOMING) {
    return null;
  }

  // Format prize display
  const prizeDisplay = drop.name;

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

export default UpcomingDropTileCondensed;
