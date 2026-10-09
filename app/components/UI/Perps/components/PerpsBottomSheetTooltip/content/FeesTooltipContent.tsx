import React from 'react';
import { View } from 'react-native';
import type { PerpsFeeSource } from '@metamask/perps-controller';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatFeeRate } from '../../../hooks/usePerpsOrderFees';
import VipIcon from '../../../../../../images/rewards/vip.svg';
import RewardsVipBadge from '../../../../Rewards/components/RewardsVipBadge/RewardsVipBadge';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface FeesTooltipContentProps extends TooltipContentProps {
  data?: {
    metamaskFeeRate?: number;
    protocolFeeRate?: number;
    originalMetamaskFeeRate?: number;
    feeDiscountPercentage?: number;
    /**
     * Winning source of the fee resolution. `subscription` renders the
     * member badge; otherwise a positive `feeDiscountPercentage` renders
     * the VIP badge.
     */
    feeSource?: PerpsFeeSource;
    bridgeFeeFormatted?: string;
  };
}

const FeesTooltipContent = ({ testID, data }: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  const metamaskFee = formatFeeRate(data?.metamaskFeeRate);
  const providerFee = formatFeeRate(data?.protocolFeeRate);
  const originalFee = formatFeeRate(data?.originalMetamaskFeeRate);
  const discountPercentage = data?.feeDiscountPercentage;

  const isMember = data?.feeSource === 'subscription';
  const hasDiscount =
    discountPercentage !== undefined && discountPercentage > 0;
  // Members always get a reduced fee, even when no rewards discount
  // percentage is reported, so strike through whenever the original is higher.
  const showStrikethrough =
    hasDiscount ||
    (isMember &&
      data?.originalMetamaskFeeRate !== undefined &&
      data?.metamaskFeeRate !== undefined &&
      data.originalMetamaskFeeRate > data.metamaskFeeRate);

  return (
    <View testID={testID}>
      {hasDiscount && (
        <View style={styles.discountBanner}>
          {!isMember && <VipIcon name="VipIcon" width={14} height={14} />}
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(
              isMember
                ? 'perps.tooltips.fees.member_discount_message'
                : 'perps.tooltips.fees.discount_message',
              {
                percentage: discountPercentage.toString(),
              },
            )}
          </Text>
        </View>
      )}

      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <View style={styles.feeValueContainer}>
          {isMember || hasDiscount ? (
            <RewardsVipBadge hasProEntitlement={isMember} />
          ) : null}
          {showStrikethrough && (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextMuted}
              style={styles.strikethroughText}
            >
              {originalFee}
            </Text>
          )}
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {metamaskFee}
          </Text>
        </View>
      </View>

      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.provider_fee')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {providerFee}
        </Text>
      </View>

      {data?.bridgeFeeFormatted ? (
        <View style={styles.feeRow}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.fees.bridge_fee')}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {data.bridgeFeeFormatted}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default FeesTooltipContent;
