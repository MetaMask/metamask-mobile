import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { PerpsOrderHeaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import type { OrderType } from '../../controllers/types';
import { formatPercentage, formatPrice } from '../../utils/formatUtils';
import { createStyles } from './PerpsOrderHeader.styles';
import { strings } from '../../../../../../locales/i18n';

interface PerpsOrderHeaderProps {
  asset: string;
  price: number;
  priceChange: number;
  orderType: OrderType;
  direction?: 'long' | 'short';
  onBack?: () => void;
  title?: string;
  onOrderTypePress?: () => void;
  isLoading?: boolean;
}

const PerpsOrderHeader: React.FC<PerpsOrderHeaderProps> = ({
  asset,
  price,
  priceChange,
  orderType,
  direction = 'long',
  onBack,
  onOrderTypePress,
  title,
  isLoading,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  }, [navigation, onBack]);

  const handleOrderTypePress = useCallback(() => {
    if (onOrderTypePress) {
      onOrderTypePress();
    }
    // Note: onOrderTypePress callback is now required
  }, [onOrderTypePress]);

  // Format price display with edge case handling
  const formattedPrice = useMemo(() => {
    // Handle invalid or edge case values
    if (!price || price <= 0 || !Number.isFinite(price)) {
      return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }

    try {
      return formatPrice(price);
    } catch {
      // Fallback if formatPrice throws
      return PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }
  }, [price]);

  return (
    <View style={styles.header} testID={PerpsOrderHeaderSelectorsIDs.HEADER}>
      <ButtonIcon
        iconName={IconName.Arrow2Left}
        onPress={handleBack}
        iconColor={IconColor.Default}
        size={ButtonIconSizes.Md}
      />
      <View style={styles.headerLeft}>
        <Text
          variant={TextVariant.HeadingMD}
          style={styles.headerTitle}
          testID={PerpsOrderHeaderSelectorsIDs.ASSET_TITLE}
        >
          {title || `${direction === 'long' ? 'Long' : 'Short'} ${asset}`}
        </Text>
        <View style={styles.priceRow}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {formattedPrice}
          </Text>
          {price > 0 && (
            <Text
              variant={TextVariant.BodyMD}
              color={priceChange >= 0 ? TextColor.Success : TextColor.Error}
            >
              {formatPercentage(priceChange)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={handleOrderTypePress}
        testID={PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON}
        disabled={isLoading}
      >
        <View style={styles.marketButton}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {orderType === 'market'
              ? strings('perps.order.market')
              : strings('perps.order.limit')}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Xs}
            color={IconColor.Default}
            style={styles.marketButtonIcon}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default PerpsOrderHeader;
