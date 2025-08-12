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
import {
  usePerpsOrderFees,
  formatFeeRate,
} from '../../../hooks/usePerpsOrderFees';
import { usePerpsOrderContext } from '../../../contexts/PerpsOrderContext';

const FeesTooltipContent = ({ testID }: TooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  const { orderForm } = usePerpsOrderContext();

  // Get actual fee rates from the hook
  const { metamaskFeeRate, protocolFeeRate } = usePerpsOrderFees({
    orderType: orderForm.type,
    amount: orderForm.amount,
  });

  const metamaskFee = formatFeeRate(metamaskFeeRate);
  const providerFee = formatFeeRate(protocolFeeRate);

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
