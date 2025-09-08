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

interface FeesTooltipContentProps extends TooltipContentProps {
  data?: {
    metamaskFeeRate?: number;
    protocolFeeRate?: number;
  };
}

const FeesTooltipContent = ({ testID, data }: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  // Use passed fee rates or show N/A if not provided
  const metamaskFee = formatFeeRate(data?.metamaskFeeRate);
  const providerFee = formatFeeRate(data?.protocolFeeRate);

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
