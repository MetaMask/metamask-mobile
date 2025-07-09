import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { createStyles } from './PerpsAssetHeader.styles';

interface PerpsAssetHeaderProps {
  price: number;
  priceChange: number;
}

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
          {
            color:
              priceChange >= 0 ? colors.success.default : colors.error.default,
          },
        ]}
      >
        {priceChange >= 0 ? '+' : ''}
        {priceChange.toFixed(2)}%
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
