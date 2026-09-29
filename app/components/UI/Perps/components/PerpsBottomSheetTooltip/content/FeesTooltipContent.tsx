import React from 'react';
import { View } from 'react-native';
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
    bridgeFeeFormatted?: string;
  };
}

const FeesTooltipContent = ({ testID, data }: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  const metamaskFee = formatFeeRate(data?.metamaskFeeRate);
  const providerFee = formatFeeRate(data?.protocolFeeRate);
  const originalFee = formatFeeRate(data?.originalMetamaskFeeRate);
  const discountPercentage = data?.feeDiscountPercentage;

  const hasDiscount = discountPercentage && discountPercentage > 0;

  return (
    <View testID={testID}>
      {hasDiscount && (
        <View style={styles.discountBanner}>
          <VipIcon name="VipIcon" width={14} height={14} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.fees.discount_message', {
              percentage: discountPercentage.toString(),
            })}
          </Text>
        </View>
      )}

      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <View style={styles.feeValueContainer}>
          {hasDiscount && <RewardsVipBadge />}
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
