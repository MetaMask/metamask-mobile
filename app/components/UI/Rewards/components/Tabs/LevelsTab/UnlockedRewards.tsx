import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Pressable } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import {
  selectUnlockedRewardLoading,
  selectSeasonRewardById,
  selectUnlockedRewards,
} from '../../../../../../reducers/rewards/selectors';
import { RewardDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import UnlockedRewardsPlaceholder from '../../../../../../images/rewards/rewards-placeholder.svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { setActiveTab } from '../../../../../../actions/rewards';
import RewardItem from './RewardItem';

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
      <RewardItem
        seasonReward={seasonReward}
        reward={reward}
        isLast={isLast}
        isLocked={false}
      />
    </Box>
  );
};

const UnlockedRewards: React.FC = () => {
  const dispatch = useDispatch();
  const unlockedRewards = useSelector(selectUnlockedRewards);
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
        <UnlockedRewardsPlaceholder
          name="UnlockedRewardsPlaceholder"
          width={80}
          height={80}
          style={tw.style('mb-4 self-center opacity-50')}
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
          testID={REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS_EMPTY_CTA}
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
