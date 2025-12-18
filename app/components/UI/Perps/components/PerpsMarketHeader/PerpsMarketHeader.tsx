import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { PerpsMarketHeaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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
import { useStyles } from '../../../../../component-library/hooks';
import type { PerpsMarketData } from '../../controllers/types';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { styleSheet } from './PerpsMarketHeader.styles';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';

interface PerpsMarketHeaderProps {
  market: PerpsMarketData;
  onBackPress?: () => void;
  onMorePress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  /**
   * Whether to show the asset info (logo, name, leverage, price) in the header.
   * When false, only shows back button and favorite star (minimal header).
   * Default: true for backward compatibility.
   */
  showAssetInfo?: boolean;
}

const PerpsMarketHeader: React.FC<PerpsMarketHeaderProps> = ({
  market,
  onBackPress,
  onMorePress,
  onFavoritePress,
  isFavorite = false,
  testID,
  showAssetInfo = true,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID}>
      {onBackPress && (
        <View style={styles.backButton}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            iconColor={IconColor.Default}
            size={ButtonIconSizes.Md}
            onPress={onBackPress}
            testID={PerpsMarketHeaderSelectorsIDs.BACK_BUTTON}
          />
        </View>
      )}

      {showAssetInfo ? (
        <>
          {/* Icon Section - Smaller size for better spacing */}
          <View style={styles.perpIcon}>
            <PerpsTokenLogo
              symbol={market.symbol}
              size={32}
              style={styles.tokenIcon}
            />
          </View>

          {/* Left Section */}
          <View style={styles.leftSection}>
            <View style={styles.assetRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Default}
                style={styles.assetName}
              >
                {getPerpsDisplaySymbol(market.symbol)}-USD
              </Text>
              <PerpsLeverage maxLeverage={market.maxLeverage} />
            </View>
            <View style={styles.secondRow}>
              <LivePriceHeader
                symbol={market.symbol}
                fallbackPrice={market.price || '0'}
                testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
                testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
                throttleMs={1000}
              />
            </View>
          </View>
        </>
      ) : (
        /* Spacer when asset info is hidden - pushes star to the right */
        <View style={styles.leftSection} />
      )}

      {/* Right Action Button */}
      {onFavoritePress ? (
        <TouchableOpacity onPress={onFavoritePress} style={styles.moreButton}>
          <Icon
            name={isFavorite ? IconName.StarFilled : IconName.Star}
            size={IconSize.Lg}
            color={IconColor.Default}
          />
        </TouchableOpacity>
      ) : (
        onMorePress && (
          <TouchableOpacity onPress={onMorePress} style={styles.moreButton}>
            <Icon
              name={IconName.MoreVertical}
              size={IconSize.Lg}
              color={IconColor.Default}
            />
          </TouchableOpacity>
        )
      )}
    </View>
  );
};

export default PerpsMarketHeader;
