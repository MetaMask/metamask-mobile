import React from 'react';
import {
  Box,
  BoxFlexDirection,
  TextVariant,
  Text,
} from '@metamask/design-system-react-native';
import { useRewardsStore } from '../../hooks';
import { strings } from '../../../../../../locales/i18n';
import { getTimeDifferenceFromNow } from '../../../../../util/date';

const formatTimeRemaining = (endDate: Date): string => {
  const { days, hours, minutes } = getTimeDifferenceFromNow(endDate.getTime());
  return hours < 0
    ? minutes < 0
      ? null
      : `${minutes}m`
    : `${days}d ${hours}h`;
};

const SeasonStatus: React.FC = () => {
  const { currentTierId, season } = useRewardsStore();

  // Memoized currentTier to avoid unnecessary recalculations
  const { tier: currentTier, order: currentTierOrder } = React.useMemo(() => {
    if (!season.tiers.length || !currentTierId)
      return { currentTier: undefined, order: 0 };
    // Sort tiers by pointsNeeded ascending
    const sortedTiers = [...season.tiers].sort(
      (a, b) => a.pointsNeeded - b.pointsNeeded,
    );
    const order =
      sortedTiers.findIndex((tier) => tier.id === currentTierId) + 1;
    return { tier: sortedTiers[order] || undefined, order };
  }, [season.tiers, currentTierId]);

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-4">
      <Box twClassName="flex-row justify-between items-center">
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
          {/* Tier image */}
          <Box twClassName="w-4 h-4 bg-gray-200 rounded-full border-dashed border-gray-400 h-[45px] w-[55px]" />

          {/* Tier name */}
          <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
            <Text variant={TextVariant.BodySm} twClassName="text-alternate">
              {currentTierOrder}
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="text-default">
              {currentTier?.name}
            </Text>
          </Box>
        </Box>

        {/* Season ends */}
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
          <Text variant={TextVariant.BodySm} twClassName="text-alternate">
            {strings('rewards.season_ends')}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-default">
            {season?.endDate ? formatTimeRemaining(season.endDate) : '-'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default SeasonStatus;
