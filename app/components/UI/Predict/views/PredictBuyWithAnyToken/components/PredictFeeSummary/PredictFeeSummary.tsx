import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import KeyValueRow from '../../../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import { IconName as IconNameLegacy } from '../../../../../../../component-library/components/Icons/Icon';
import Skeleton from '../../../../../../../component-library/components/Skeleton/Skeleton';
import {
  TextColor as LegacyTextColor,
  TextVariant as LegacyTextVariant,
} from '../../../../../../../component-library/components/Texts/Text/Text.types';
import AddRewardsAccount from '../../../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../../../Rewards/components/RewardPointsAnimation';
import { usePredictRewards } from '../../../../hooks/usePredictRewards';
import { formatPrice } from '../../../../utils/format';

interface PredictFeeSummaryProps {
  disabled: boolean;
  loading?: boolean;
  total: number;
  rewardsFeeAmountUsd?: number;
  rewardsLoadingOverride?: boolean;
  handleFeesInfoPress: () => void;
}

const PredictFeeSummary: React.FC<PredictFeeSummaryProps> = ({
  disabled,
  loading = false,
  handleFeesInfoPress,
  total,
  rewardsFeeAmountUsd,
  rewardsLoadingOverride = false,
}) => {
  const tw = useTailwind();
  const {
    shouldShowRewardsRow,
    accountOptedIn,
    rewardsAccountScope,
    estimatedPoints,
    isLoading: isLoadingRewards,
    hasError: hasRewardsError,
  } = usePredictRewards(rewardsFeeAmountUsd);
  const isRewardsLoading = rewardsLoadingOverride || isLoadingRewards;

  const rowClassName = 'flex-row justify-between items-center min-h-[20px]';
  const shouldRenderRewardsRow =
    shouldShowRewardsRow && (accountOptedIn || rewardsAccountScope);

  if (disabled) {
    return null;
  }

  if (loading) {
    return (
      <Box twClassName="pt-4 px-4 pb-6 flex-col gap-4">
        <Box twClassName="py-1">
          <Box twClassName="flex-row justify-between items-center">
            <Box twClassName="flex-col">
              <Skeleton width={52} height={16} style={tw.style('my-1')} />
              <Box twClassName="flex-row items-center gap-1">
                <Skeleton width={96} height={14} style={tw.style('my-1')} />
                <Skeleton
                  width={16}
                  height={16}
                  style={tw.style('rounded-full')}
                />
              </Box>
            </Box>
            <Skeleton width={80} height={24} style={tw.style('my-1')} />
          </Box>
        </Box>
        {shouldRenderRewardsRow && (
          <Box twClassName={rowClassName}>
            <Skeleton width={120} height={16} style={tw.style('my-1')} />
            <Skeleton width={92} height={16} style={tw.style('my-1')} />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box twClassName="pt-4 px-4 pb-6 flex-col gap-4">
        <TouchableOpacity
          onPress={handleFeesInfoPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={tw.style('py-1')}
        >
          <Box twClassName="flex-row justify-between items-center">
            <Box twClassName="flex-col">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {strings('predict.fee_summary.total')}
              </Text>
              <Box twClassName="flex-row items-center gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('predict.fee_summary.total_incl_fees')}
                </Text>
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </Box>
            </Box>
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {formatPrice(total, { maximumDecimals: 2 })}
            </Text>
          </Box>
        </TouchableOpacity>

        {/* Estimated Points Row */}
        {shouldRenderRewardsRow && (
          <KeyValueRow
            field={{
              label: {
                text: strings('predict.fee_summary.estimated_points'),
                variant: LegacyTextVariant.BodyMD,
                color: LegacyTextColor.Default,
              },
              tooltip: {
                title: strings('predict.fee_summary.points_tooltip'),
                content: `${strings(
                  'predict.fee_summary.points_tooltip_content_1',
                )}\n\n${strings('predict.fee_summary.points_tooltip_content_2')}`,
                size: TooltipSizes.Sm,
                iconName: IconNameLegacy.Info,
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
                        isRewardsLoading
                          ? RewardAnimationState.Loading
                          : hasRewardsError
                            ? RewardAnimationState.ErrorState
                            : RewardAnimationState.Idle
                      }
                    />
                  ) : rewardsAccountScope ? (
                    <AddRewardsAccount account={rewardsAccountScope} />
                  ) : null}
                </Box>
              ),
              ...(hasRewardsError && {
                tooltip: {
                  title: strings('predict.fee_summary.points_error'),
                  content: strings('predict.fee_summary.points_error_content'),
                  size: TooltipSizes.Sm,
                  iconName: IconNameLegacy.Info,
                },
              }),
            }}
          />
        )}
      </Box>
    </>
  );
};

export default PredictFeeSummary;
