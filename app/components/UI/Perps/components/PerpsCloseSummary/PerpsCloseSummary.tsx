import React, { useCallback } from 'react';
import { View, ActivityIndicator, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import { strings } from '../../../../../../locales/i18n';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import PerpsFeesDisplay from '../PerpsFeesDisplay';
import { type PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import AddRewardsAccount from '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import { useStyles } from '../../../../hooks/useStyles';
import createStyles from './PerpsCloseSummary.styles';
import Routes from '../../../../../constants/navigation/Routes';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  FontWeight,
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface PerpsCloseSummaryProps {
  /** Total margin including P&L */
  totalMargin: number;
  /** Total unrealized P&L (for "includes P&L" breakdown) */
  totalPnl: number;

  /** Total fees for closing (undefined when unavailable) */
  totalFees?: number;
  /** Total fees before any VIP discount (shown struck-through when discount is active) */
  originalTotalFees?: number;
  /** Fee discount percentage (0-100, undefined when unavailable) */
  feeDiscountPercentage?: number;
  /** MetaMask fee rate (as decimal, e.g. 0.01 for 1%) - undefined means unavailable/error state */
  metamaskFeeRate?: number;
  /** Protocol fee rate (as decimal, e.g. 0.00045 for 0.045%) - undefined means unavailable/error state */
  protocolFeeRate?: number;
  /** Original MetaMask fee rate before discounts - undefined means unavailable/error state */
  originalMetamaskFeeRate?: number;

  /** Amount user will receive after closing */
  receiveAmount: number;

  /** Whether to show rewards section */
  shouldShowRewards: boolean;
  /** Estimated points to be earned */
  estimatedPoints?: number;
  /** Bonus multiplier in basis points */
  bonusBips?: number;
  /** Whether fees calculation is loading */
  isLoadingFees?: boolean;
  /** Whether rewards calculation is loading */
  isLoadingRewards?: boolean;
  /** Whether there was an error calculating rewards */
  hasRewardsError?: boolean;
  /** Whether the account has opted in to rewards */
  accountOptedIn?: boolean | null;
  /** The account that is currently in scope */
  rewardsAccount?: InternalAccount | null;
  /** Optional styling for container */
  style?: ViewStyle;
  /** Whether input is focused (for padding adjustment) */
  isInputFocused?: boolean;

  /** Whether to enable tooltips (default: true) */
  enableTooltips?: boolean;

  /** Optional test IDs for tooltips */
  testIDs?: {
    feesTooltip?: string;
    receiveTooltip?: string;
    pointsTooltip?: string;
    marginValue?: string;
    feesValue?: string;
    receiveValue?: string;
  };
}

/**
 * Shared summary component for closing positions
 *
 * Displays:
 * - Margin (with P&L breakdown)
 * - Fees (with discount indicator)
 * - Receive amount
 * - Estimated points (optional)
 *
 * Tooltips can be disabled via the `enableTooltips` prop (defaults to true).
 * Tooltips are now navigated to via the StackNavigator pattern.
 */
const PerpsCloseSummary: React.FC<PerpsCloseSummaryProps> = ({
  totalMargin,
  totalPnl,
  totalFees,
  originalTotalFees,
  feeDiscountPercentage,
  metamaskFeeRate,
  protocolFeeRate,
  originalMetamaskFeeRate,
  receiveAmount,
  shouldShowRewards,
  estimatedPoints = 0,
  bonusBips = 0,
  isLoadingFees = false,
  isLoadingRewards = false,
  hasRewardsError = false,
  accountOptedIn = null,
  rewardsAccount = undefined,
  style,
  isInputFocused = false,
  enableTooltips = true,
  testIDs,
}) => {
  const { styles, theme } = useStyles(createStyles, {});
  const navigation = useNavigation<AppNavigationProp>();

  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey, data?: Record<string, unknown>) => {
      if (enableTooltips) {
        navigation.navigate(Routes.PERPS.MODALS.CLOSE_POSITION_MODALS, {
          screen: Routes.PERPS.MODALS.TOOLTIP,
          params: {
            contentKey,
            data,
          },
        });
      }
    },
    [enableTooltips, navigation],
  );

  // Determine reward animation state based on loading and error states
  const getRewardAnimationState = () => {
    if (isLoadingRewards) {
      return RewardAnimationState.Loading;
    }
    if (hasRewardsError) {
      return RewardAnimationState.ErrorState;
    }
    return RewardAnimationState.Idle;
  };

  const rewardAnimationState = getRewardAnimationState();

  const feesValue = isLoadingFees ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={theme.colors.icon.alternative} />
    </View>
  ) : totalFees !== undefined ? (
    <PerpsFeesDisplay
      feeDiscountPercentage={feeDiscountPercentage}
      fee={totalFees}
      originalFee={originalTotalFees}
      testID={testIDs?.feesValue}
      variant={TextVariant.BodyMd}
    />
  ) : (
    '--'
  );

  const pointsValue = accountOptedIn ? (
    <RewardsAnimations
      value={estimatedPoints}
      bonusBips={bonusBips}
      shouldShow={shouldShowRewards}
      state={rewardAnimationState}
    />
  ) : (
    <AddRewardsAccount account={rewardsAccount ?? undefined} />
  );

  return (
    <View
      style={[
        styles.summaryContainer,
        isInputFocused && styles.paddingHorizontal,
        style,
      ]}
    >
      {/* Margin with P&L breakdown — custom row to support nested includes P&L */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('perps.close_position.margin')}
          </Text>
        </View>
        <View style={styles.summaryValue}>
          <Text
            testID={testIDs?.marginValue}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {formatPerpsFiat(totalMargin, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })}
          </Text>
          <View style={styles.inclusiveFeeRow}>
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {strings('perps.close_position.includes_pnl')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={
                totalPnl < 0 ? TextColor.ErrorDefault : TextColor.SuccessDefault
              }
            >
              {totalPnl < 0 ? '-' : '+'}
              {formatPerpsFiat(Math.abs(totalPnl), {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
          </View>
        </View>
      </View>

      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.close_position.fees')}
        {...(enableTooltips && {
          keyEndButtonIconProps: {
            iconName: IconName.Info,
            onPress: () =>
              handleTooltipPress('closing_fees', {
                metamaskFeeRate,
                protocolFeeRate,
                originalMetamaskFeeRate,
                feeDiscountPercentage,
              }),
            testID: testIDs?.feesTooltip,
          },
        })}
        value={feesValue}
      />

      <SectionDivider marginVertical={1} />

      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.close_position.you_receive')}
        {...(enableTooltips && {
          keyEndButtonIconProps: {
            iconName: IconName.Info,
            onPress: () => handleTooltipPress('close_position_you_receive'),
            testID: testIDs?.receiveTooltip,
          },
        })}
        value={formatPerpsFiat(receiveAmount, {
          ranges: PRICE_RANGES_MINIMAL_VIEW,
        })}
        valueTextProps={{
          testID: testIDs?.receiveValue,
        }}
      />

      {shouldShowRewards &&
        (accountOptedIn ||
          (accountOptedIn === false && rewardsAccount !== undefined)) && (
          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.estimated_points')}
            {...(enableTooltips && {
              keyEndButtonIconProps: {
                iconName: IconName.Info,
                onPress: () => handleTooltipPress('points'),
                testID: testIDs?.pointsTooltip,
              },
            })}
            value={pointsValue}
          />
        )}
    </View>
  );
};

export default PerpsCloseSummary;
