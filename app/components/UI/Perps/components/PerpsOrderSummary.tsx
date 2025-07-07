import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import PerpsOrderRow from './PerpsOrderRow';
import { strings } from '../../../../../locales/i18n';

interface PerpsOrderSummaryProps {
  balance: string;
  fees: string;
}

const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      marginTop: 32,
    },
  });

const PerpsOrderSummary: React.FC<PerpsOrderSummaryProps> = ({
  balance,
  fees,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <PerpsOrderRow label={strings('perps.order.balance')}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {balance}
        </Text>
      </PerpsOrderRow>
      <PerpsOrderRow label={strings('perps.order.fees')}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {fees}
        </Text>
      </PerpsOrderRow>
    </View>
  );
};

export default PerpsOrderSummary;
