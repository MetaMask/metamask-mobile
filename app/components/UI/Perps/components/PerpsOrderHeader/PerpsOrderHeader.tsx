import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import TokenIcon from '../../../Swaps/components/TokenIcon';
import { formatPrice, formatPercentage } from '../../utils/formatUtils';
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../../constants/hyperLiquidConfig';
import type { OrderType } from '../../controllers/types';

const FALLBACK_PRICE_DISPLAY = '$---';

interface PerpsOrderHeaderProps {
  asset: string;
  price: number;
  priceChange: number;
  orderType: OrderType;
  onBack?: () => void;
  onOrderTypePress?: () => void;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerCenterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 18,
    },
    headerPriceChange: {
      fontSize: 14,
    },
    marketButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    tokenIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
  });

const PerpsOrderHeader: React.FC<PerpsOrderHeaderProps> = ({
  asset,
  price,
  priceChange,
  orderType,
  onBack,
  onOrderTypePress,
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

  // Get asset icon URL from Hyperliquid
  const assetIconUrl = useMemo(
    () => `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${asset.toLowerCase()}.png`,
    [asset],
  );

  // Format price display with edge case handling
  const formattedPrice = useMemo(() => {
    // Handle invalid or edge case values
    if (!price || price <= 0 || !Number.isFinite(price)) {
      return FALLBACK_PRICE_DISPLAY;
    }

    try {
      return formatPrice(price);
    } catch {
      // Fallback if formatPrice throws
      return FALLBACK_PRICE_DISPLAY;
    }
  }, [price]);

  return (
    <View style={styles.header}>
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        onPress={handleBack}
        iconColor={IconColor.Default}
        size={ButtonIconSizes.Sm}
      />
      <View style={styles.headerCenter}>
        <View style={styles.headerCenterRow}>
          <TokenIcon
            symbol={asset}
            icon={assetIconUrl}
            style={styles.tokenIcon}
          />
          <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
            {asset} {formattedPrice}
          </Text>
          {price > 0 && (
            <Text
              variant={TextVariant.BodyMD}
              color={priceChange >= 0 ? TextColor.Success : TextColor.Error}
              style={styles.headerPriceChange}
            >
              {formatPercentage(priceChange)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={handleOrderTypePress}>
        <View style={styles.marketButton}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {orderType === 'market' ? 'Market' : 'Limit'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default PerpsOrderHeader;
