import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { SnapshotDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import RewardsThemeImageComponent from '../ThemeImageComponent';
import { getSnapshotStatusInfo } from './SnapshotTile.utils';

interface SnapshotTileProps {
  /**
   * The snapshot data to display
   */
  snapshot: SnapshotDto;
}

/**
 * SnapshotTile component displays snapshot/airdrop information with status.
 *
 * Shows:
 * - Background image
 * - Status pill (Live now, Up next, Calculating, Results Ready, Complete)
 * - Status label with date
 * - Prize information
 */
const SnapshotTile: React.FC<SnapshotTileProps> = ({ snapshot }) => {
  const tw = useTailwind();

  const { status, statusLabel, statusDescription, statusDescriptionIcon } =
    useMemo(() => getSnapshotStatusInfo(snapshot), [snapshot]);

  // Format prize display (e.g., "$50,000 Monad")
  const prizeDisplay = useMemo(
    () =>
      // For now, just show the token symbol and name
      // The actual formatting would depend on how we want to display the amount
      `${snapshot.name}`,
    [snapshot],
  );

  return (
    <Box twClassName="rounded-lg overflow-hidden relative h-50">
      {/* Background Image */}
      <View style={tw.style('absolute w-full h-full')}>
        <RewardsThemeImageComponent
          themeImage={snapshot.backgroundImage}
          style={tw.style('w-full h-full')}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        justifyContent={BoxJustifyContent.Between}
        twClassName="p-4 flex-1"
      >
        {/* Status Description Icon and Text */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {status === 'calculating' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon
              name={statusDescriptionIcon}
              size={IconSize.Sm}
              twClassName="text-white "
            />
          )}
          <Text variant={TextVariant.BodySm} twClassName="text-white ">
            {statusDescription}
          </Text>
        </Box>

        {/* Bottom Content */}
        <Box flexDirection={BoxFlexDirection.Column}>
          <Text variant={TextVariant.BodySm} twClassName="text-white">
            {statusLabel}
          </Text>

          {/* Prize Info */}
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-white font-bold"
          >
            {prizeDisplay}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default SnapshotTile;
