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

const FeesTooltipContent = ({ testID }: TooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});
  const metamaskFee = '0.1%'; // This should come from actual fee calculation
  const providerFee = '0.0432%'; // This should come from actual fee calculation

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
