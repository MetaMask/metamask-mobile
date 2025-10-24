import React, { useCallback, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import PerpsFeesDisplay from '../PerpsFeesDisplay';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { type PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import { useStyles } from '../../../../hooks/useStyles';
import createStyles from './PerpsCloseSummary.styles';

export interface PerpsCloseSummaryProps {
  /** Total margin including P&L */
  totalMargin: number;
  /** Total unrealized P&L (for "includes P&L" breakdown) */
  totalPnl: number;

  /** Total fees for closing */
  totalFees: number;
  /** Fee discount percentage (0-100) */
  feeDiscountPercentage?: number;
  /** MetaMask fee rate (as decimal, e.g. 0.01 for 1%) */
  metamaskFeeRate: number;
  /** Protocol fee rate (as decimal, e.g. 0.00045 for 0.045%) */
  protocolFeeRate: number;
  /** Original MetaMask fee rate before discounts */
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
 * Useful when this component is used within a bottom sheet to avoid nested modals.
 */
const PerpsCloseSummary: React.FC<PerpsCloseSummaryProps> = ({
  totalMargin,
  totalPnl,
  totalFees,
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
  style,
  isInputFocused = false,
  enableTooltips = true,
  testIDs,
}) => {
  const { styles, theme } = useStyles(createStyles, {});
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      if (enableTooltips) {
        setSelectedTooltip(contentKey);
      }
    },
    [enableTooltips],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  return (
    <>
      <View
        style={[
          styles.summaryContainer,
          isInputFocused && styles.paddingHorizontal,
          style,
        ]}
      >
        {/* Margin with P&L breakdown */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabel}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.close_position.margin')}
            </Text>
          </View>
          <View style={styles.summaryValue}>
            <Text variant={TextVariant.BodyMD}>
              {formatPerpsFiat(totalMargin, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
            <View style={styles.inclusiveFeeRow}>
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                {strings('perps.close_position.includes_pnl')}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                color={totalPnl < 0 ? TextColor.Error : TextColor.Success}
              >
                {totalPnl < 0 ? '-' : '+'}
                {formatPerpsFiat(Math.abs(totalPnl), {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Fees with discount */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabel}>
            {enableTooltips ? (
              <TouchableOpacity
                onPress={() => handleTooltipPress('closing_fees')}
                style={styles.labelWithTooltip}
                testID={testIDs?.feesTooltip}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.close_position.fees')}
                </Text>
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            ) : (
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.close_position.fees')}
              </Text>
            )}
          </View>
          <View style={styles.summaryValue}>
            {isLoadingFees ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.icon.alternative}
                />
              </View>
            ) : (
              <PerpsFeesDisplay
                feeDiscountPercentage={feeDiscountPercentage}
                formatFeeText={`-${formatPerpsFiat(totalFees, {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                })}`}
                variant={TextVariant.BodyMD}
              />
            )}
          </View>
        </View>

        {/* You'll receive */}
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <View style={styles.summaryLabel}>
            {enableTooltips ? (
              <TouchableOpacity
                onPress={() => handleTooltipPress('close_position_you_receive')}
                style={styles.labelWithTooltip}
                testID={testIDs?.receiveTooltip}
              >
                <Text variant={TextVariant.BodyMD}>
                  {strings('perps.close_position.you_receive')}
                </Text>
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            ) : (
              <Text variant={TextVariant.BodyMD}>
                {strings('perps.close_position.you_receive')}
              </Text>
            )}
          </View>
          <View style={styles.summaryValue}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {formatPerpsFiat(receiveAmount, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
          </View>
        </View>

        {/* Estimated Points */}
        {shouldShowRewards && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              {enableTooltips ? (
                <TouchableOpacity
                  onPress={() => handleTooltipPress('points')}
                  style={styles.labelWithTooltip}
                  testID={testIDs?.pointsTooltip}
                >
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {strings('perps.estimated_points')}
                  </Text>
                  <Icon
                    name={IconName.Info}
                    size={IconSize.Sm}
                    color={IconColor.Muted}
                  />
                </TouchableOpacity>
              ) : (
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {strings('perps.estimated_points')}
                </Text>
              )}
            </View>
            <View style={styles.summaryValue}>
              <RewardsAnimations
                value={estimatedPoints}
                bonusBips={bonusBips}
                shouldShow={shouldShowRewards}
                state={
                  isLoadingRewards
                    ? RewardAnimationState.Loading
                    : hasRewardsError
                    ? RewardAnimationState.ErrorState
                    : RewardAnimationState.Idle
                }
              />
            </View>
          </View>
        )}
      </View>

      {/* Tooltip Bottom Sheets */}
      {enableTooltips && selectedTooltip === 'closing_fees' && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey="closing_fees"
          data={{
            metamaskFeeRate,
            protocolFeeRate,
            originalMetamaskFeeRate,
            feeDiscountPercentage,
          }}
        />
      )}

      {enableTooltips && selectedTooltip === 'close_position_you_receive' && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey="close_position_you_receive"
        />
      )}

      {enableTooltips && selectedTooltip === 'points' && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey="points"
        />
      )}
    </>
  );
};

export default PerpsCloseSummary;
