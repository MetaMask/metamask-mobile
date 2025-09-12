import React from 'react';
import { useSelector } from 'react-redux';
import { Image } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import {
  selectUnlockedRewardLoading,
  selectSeasonRewardById,
  selectUnlockedRewards,
} from '../../../../../../reducers/rewards/selectors';
import { RewardDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import rewardsPlaceholder from '../../../../../../images/rewards/rewards-placeholder.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RewardItem } from './UpcomingRewards';

interface UnlockedRewardItemProps {
  reward: RewardDto;
  isLast?: boolean;
}

const UnlockedRewardItem: React.FC<UnlockedRewardItemProps> = ({
  reward,
  isLast = false,
}) => {
  const seasonReward = useSelector(
    selectSeasonRewardById(reward.seasonRewardId),
  );
  if (!seasonReward) {
    return null;
  }

  return (
    <Box twClassName=" bg-background-muted">
      <RewardItem reward={seasonReward} isLast={isLast} />
    </Box>
  );
};

const UnlockedRewards: React.FC = () => {
  const unlockedRewards = useSelector(selectUnlockedRewards);
  /* use some mock data
  const unlockedRewards = [
    {
      id: '1',
      seasonRewardId: 'f9a281f5-500a-4c64-b2a5-2a828eb01463',
      claimStatus: RewardClaimStatus.CLAIMED,
    },
    {
      id: '2',
      seasonRewardId: '5dfa42ab-58b9-4c53-b72f-7cf63e200284',
      claimStatus: RewardClaimStatus.UNCLAIMED,
    },
  ]; */
  const isLoading = useSelector(selectUnlockedRewardLoading);
  const tw = useTailwind();

  if (isLoading) {
    return null;
  }

  if (!unlockedRewards.length) {
    return (
      <Box twClassName="py-4">
        {/* Section Title */}
        <Box twClassName="mb-4">
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.unlocked_rewards_title')}
          </Text>
        </Box>
        <Image
          source={rewardsPlaceholder}
          resizeMode="contain"
          style={tw.style('h-20 w-20 self-center')}
        />
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-text-alternative text-center mb-2"
        >
          {strings('rewards.unlocked_rewards_empty')}
        </Text>
      </Box>
    );
  }

  return (
    <Box twClassName="py-4">
      {/* Section Title */}
      <Box twClassName="mb-4">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.unlocked_rewards_title')}
        </Text>
      </Box>

      {/* Unlocked Rewards List */}
      <Box twClassName="rounded-xl overflow-hidden bg-background-default">
        {unlockedRewards.map((reward, index) => (
          <UnlockedRewardItem
            key={reward.id}
            reward={reward}
            isLast={index === unlockedRewards.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};

export default UnlockedRewards;
