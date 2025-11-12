import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import { formatPrice } from '../../utils/format';

interface PredictFeeSummaryProps {
  disabled: boolean;
  providerFee: number;
  metamaskFee: number;
  total: number;
  shouldShowRewards?: boolean;
  estimatedPoints?: number;
  isLoadingRewards?: boolean;
  hasRewardsError?: boolean;
}

const PredictFeeSummary: React.FC<PredictFeeSummaryProps> = ({
  disabled,
  metamaskFee,
  providerFee,
  total,
  shouldShowRewards = false,
  estimatedPoints = 0,
  isLoadingRewards = false,
  hasRewardsError = false,
}) => {
  if (disabled) {
    return null;
  }
  return (
    <Box twClassName="pt-4 px-4 pb-6 flex-col gap-4">
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName=" flex-row gap-2 items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.provider_fee')}
          </Text>
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(providerFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row gap-2 items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.metamask_fee')}
          </Text>
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(metamaskFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>

      {/* Estimated Points Row */}
      {shouldShowRewards && (
        <KeyValueRow
          field={{
            label: {
              text: strings('predict.fee_summary.estimated_points'),
              variant: TextVariant.BodyMD,
              color: TextColor.Alternative,
            },
            tooltip: {
              title: strings('predict.fee_summary.points_tooltip'),
              content: `${strings(
                'predict.fee_summary.points_tooltip_content_1',
              )}\n\n${strings('predict.fee_summary.points_tooltip_content_2')}`,
              size: TooltipSizes.Sm,
              iconName: IconName.Info,
            },
          }}
          value={{
            label: (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                gap={1}
              >
                <RewardsAnimations
                  value={estimatedPoints}
                  state={
                    isLoadingRewards
                      ? RewardAnimationState.Loading
                      : hasRewardsError
                        ? RewardAnimationState.ErrorState
                        : RewardAnimationState.Idle
                  }
                  variant={TextVariant.BodyMD}
                />
              </Box>
            ),
            ...(hasRewardsError && {
              tooltip: {
                title: strings('predict.fee_summary.points_error'),
                content: strings('predict.fee_summary.points_error_content'),
                size: TooltipSizes.Sm,
                iconName: IconName.Info,
              },
            }),
          }}
        />
      )}

      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row gap-2 items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.total')}
          </Text>
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(total, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
    </Box>
  );
};

export default PredictFeeSummary;
