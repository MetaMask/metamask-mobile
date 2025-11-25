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
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import { formatPrice } from '../../utils/format';
import AddRewardsAccount from '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import { InternalAccount } from '@metamask/keyring-internal-api';

interface PredictFeeSummaryProps {
  disabled: boolean;
  providerFee: number;
  metamaskFee: number;
  total: number;
  shouldShowRewardsRow?: boolean;
  accountOptedIn?: boolean | null;
  rewardsAccountScope?: InternalAccount | null;
  estimatedPoints?: number | null;
  isLoadingRewards?: boolean;
  hasRewardsError?: boolean;
  onFeesInfoPress?: () => void;
}

const PredictFeeSummary: React.FC<PredictFeeSummaryProps> = ({
  disabled,
  metamaskFee,
  providerFee,
  total,
  shouldShowRewardsRow = false,
  accountOptedIn = null,
  rewardsAccountScope = null,
  estimatedPoints = 0,
  isLoadingRewards = false,
  hasRewardsError = false,
  onFeesInfoPress,
}) => {
  if (disabled) {
    return null;
  }

  const totalFees = providerFee + metamaskFee;

  return (
    <Box twClassName="pt-4 px-4 pb-6 flex-col gap-4">
      {/* Fees Row with Info Icon */}
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.fees')}
          </Text>
          <ButtonIcon
            size={TooltipSizes.Sm}
            iconColor={IconColor.Alternative}
            iconName={IconName.Info}
            onPress={onFeesInfoPress}
          />
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(totalFees, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>

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

      {/* Estimated Points Row */}
      {shouldShowRewardsRow && (accountOptedIn || rewardsAccountScope) && (
        <KeyValueRow
          field={{
            label: {
              text: strings('predict.fee_summary.estimated_points'),
              variant: TextVariant.BodyMD,
              color: TextColor.Default,
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
                {accountOptedIn ? (
                  <RewardsAnimations
                    value={estimatedPoints ?? 0}
                    state={
                      isLoadingRewards
                        ? RewardAnimationState.Loading
                        : hasRewardsError
                          ? RewardAnimationState.ErrorState
                          : RewardAnimationState.Idle
                    }
                  />
                ) : rewardsAccountScope ? (
                  <AddRewardsAccount account={rewardsAccountScope} />
                ) : (
                  <></>
                )}
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
    </Box>
  );
};

export default PredictFeeSummary;
