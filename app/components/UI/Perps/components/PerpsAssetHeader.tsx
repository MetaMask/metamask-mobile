import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { strings } from '../../../../../locales/i18n';

interface PerpsAssetHeaderProps {
  price: number;
  priceChange: number;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    priceChange: {
      marginTop: 4,
    },
    marketButton: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 16,
    },
  });

const PerpsAssetHeader: React.FC<PerpsAssetHeaderProps> = ({
  price,
  priceChange,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
        ${price.toLocaleString()}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        style={[
          styles.priceChange,
          { color: priceChange >= 0 ? colors.success.default : colors.error.default }
        ]}
      >
        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
      </Text>
      <View style={styles.marketButton}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('perps.order.market')}
        </Text>
      </View>
    </View>
  );
};

export default PerpsAssetHeader;

