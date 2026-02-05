import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getDropStatusInfo } from './DropTile.Utils';
import Routes from '../../../../../constants/navigation/Routes';

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
  const navigation = useNavigation();

  const { status, statusDescription } = useMemo(
    () => getDropStatusInfo(drop),
    [drop],
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_DROP_DETAIL, { dropId: drop.id });
  }, [navigation, drop.id]);

  // Return null if not upcoming
  if (status !== DropStatus.UPCOMING) {
    return null;
  }

  // Format prize display
  const prizeDisplay = drop.name;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
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
    </TouchableOpacity>
  );
};

export default UpcomingDropTileCondensed;
