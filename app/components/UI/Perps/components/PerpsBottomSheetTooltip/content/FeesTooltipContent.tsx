import React from 'react';
import { Image, View } from 'react-native';
import type { PerpsFeeSource } from '@metamask/perps-controller';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatFeeRate } from '../../../hooks/usePerpsOrderFees';
import VipIcon from '../../../../../../images/rewards/vip.svg';
import foxIcon from '../../../../../../images/fox.png';
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

  const hasDiscount =
    discountPercentage !== undefined && discountPercentage > 0;
  const isSubscriptionDiscount = data?.feeSource === 'subscription';

  return (
    <View testID={testID}>
      {hasDiscount && (
        <View style={styles.discountBanner}>
          {isSubscriptionDiscount ? (
            <Image
              source={foxIcon}
              style={styles.memberIcon}
              resizeMode="contain"
            />
          ) : (
            <VipIcon name="VipIcon" width={14} height={14} />
          )}
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(
              isSubscriptionDiscount
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
          {hasDiscount ? (
            <RewardsVipBadge hasProEntitlement={isSubscriptionDiscount} />
          ) : null}
          {hasDiscount && (
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
