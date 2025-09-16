import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Image, Pressable } from 'react-native';
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
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { setActiveTab } from '../../../../../../actions/rewards';

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
  const dispatch = useDispatch();
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
      <Box
        twClassName="py-4"
        testID={REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS_EMPTY}
      >
        {/* Section Title */}
        <Box twClassName="mb-4">
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.unlocked_rewards.title')}
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
          {strings('rewards.unlocked_rewards.empty')}
        </Text>
        <Pressable
          onPress={() => dispatch(setActiveTab('overview'))}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-primary-default text-center"
          >
            {strings('rewards.unlocked_rewards.see_ways_to_earn')}
          </Text>
        </Pressable>
      </Box>
    );
  }

  return (
    <Box twClassName="py-4" testID={REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS}>
      {/* Section Title */}
      <Box twClassName="mb-4">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.unlocked_rewards.title')}
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
