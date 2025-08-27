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
import { METAMASK_FEE_CONFIG } from '../../../constants/perpsConfig';
import { FEE_RATES } from '../../../constants/hyperLiquidConfig';

interface FeesTooltipContentProps extends TooltipContentProps {
  isMarketOrder?: boolean;
}

const FeesTooltipContent = ({
  testID,
  isMarketOrder = true,
}: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  // Calculate fee rates based on order type
  const metamaskFee = formatFeeRate(METAMASK_FEE_CONFIG.TRADING_FEE_RATE);
  const providerFee = formatFeeRate(
    isMarketOrder ? FEE_RATES.taker : FEE_RATES.maker,
  );

  return (
    <View testID={testID}>
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {metamaskFee}
        </Text>
      </View>
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
