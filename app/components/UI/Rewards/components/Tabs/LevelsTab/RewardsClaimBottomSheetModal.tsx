import React, { useCallback, useMemo } from 'react';
import useClaimReward from '../../../hooks/useClaimReward';
import RewardsBottomSheetModal, {
  RewardsBottomSheetModalProps,
} from '../../RewardsBottomSheetModal';
import {
  ClaimRewardDto,
  SeasonRewardType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import { ButtonVariant } from '@metamask/design-system-react-native';

/**
 * Specialized claim reward modal based on RewardsBottomSheetModal
 */

const RewardsClaimBottomSheetModal = ({
  route,
}: RewardsBottomSheetModalProps & {
  route: {
    params: {
      rewardId: string;
      rewardType: SeasonRewardType;
      isLocked: boolean;
    };
  };
}) => {
  const { claimReward, isClaimingReward, claimRewardError } = useClaimReward();
  const { rewardId, rewardType, isLocked } = route.params;
  const navigation = useNavigation();

  const handleModalClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClaimReward = useCallback(
    async (inputValue?: string) => {
      const claimData = {} as ClaimRewardDto;

      if (rewardType === SeasonRewardType.ALPHA_FOX_INVITE && inputValue) {
        claimData.data = { telegramHandle: inputValue };
      }

      try {
        await claimReward(rewardId, claimData);
        handleModalClose();
      } catch (error) {
        // keep modal open to display error message
      }
    },
    [claimReward, handleModalClose, rewardId, rewardType],
  );

  const rewardConfirmAction = useMemo(() => {
    if (isLocked) {
      return {
        label: strings('rewards.upcoming_rewards.cta_label'),
        onPress: handleModalClose,
        variant: ButtonVariant.Secondary,
      };
    }

    switch (rewardType) {
      case SeasonRewardType.GENERIC:
      case SeasonRewardType.PERPS_DISCOUNT:
        return {
          label: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleModalClose,
          variant: ButtonVariant.Primary,
        };
      case SeasonRewardType.POINTS_BOOST:
        return {
          label: strings('rewards.unlocked_rewards.cta_label'),
          onPress: handleClaimReward,
          variant: ButtonVariant.Primary,
          disabled: isClaimingReward,
        };
      case SeasonRewardType.ALPHA_FOX_INVITE:
        return {
          label: strings('rewards.unlocked_rewards.cta_request_invite'),
          onPress: handleClaimReward,
          variant: ButtonVariant.Primary,
          disabled: isClaimingReward,
        };
      default:
        return {
          label: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleModalClose,
          variant: ButtonVariant.Secondary,
        };
    }
  }, [
    handleClaimReward,
    handleModalClose,
    isClaimingReward,
    isLocked,
    rewardType,
  ]);

  return (
    <RewardsBottomSheetModal
      route={{
        ...route,
        params: {
          ...route.params,
          confirmAction: rewardConfirmAction,
          error: claimRewardError,
        },
      }}
    />
  );
};

export default RewardsClaimBottomSheetModal;
