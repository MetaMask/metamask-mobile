import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatFeeRate } from '../../../hooks/usePerpsOrderFees';
import FoxIcon from '../../FoxIcon/FoxIcon';

interface FeesTooltipContentProps extends TooltipContentProps {
  data?: {
    metamaskFeeRate?: number;
    protocolFeeRate?: number;
    originalMetamaskFeeRate?: number;
    feeDiscountPercentage?: number;
  };
}

const FeesTooltipContent = ({ testID, data }: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  // Use passed fee rates or show N/A if not provided
  const metamaskFee = formatFeeRate(data?.metamaskFeeRate);
  const providerFee = formatFeeRate(data?.protocolFeeRate);
  const originalFee = formatFeeRate(data?.originalMetamaskFeeRate);
  const discountPercentage = data?.feeDiscountPercentage;

  // Check if there's a discount to display
  const hasDiscount = discountPercentage && discountPercentage > 0;

  return (
    <View testID={testID}>
      {/* Discount Banner */}
      {hasDiscount && (
        <View style={styles.discountBanner}>
          <FoxIcon width={16} height={16} />
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {strings('perps.tooltips.fees.discount_message', {
              percentage: discountPercentage.toString(),
            })}
          </Text>
        </View>
      )}

      {/* MetaMask Fee Row */}
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <View style={styles.feeValueContainer}>
          {hasDiscount && (
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.strikethroughText}
            >
              {originalFee}
            </Text>
          )}
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {metamaskFee}
          </Text>
        </View>
      </View>

      {/* Provider Fee Row */}
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('perps.tooltips.fees.provider_fee')}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {providerFee}
        </Text>
      </View>
    </View>
  );
};

export default FeesTooltipContent;
