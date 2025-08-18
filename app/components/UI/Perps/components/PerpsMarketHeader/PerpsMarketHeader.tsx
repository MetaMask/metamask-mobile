import React from 'react';
import { TouchableOpacity, View } from 'react-native';
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
import RemoteImage from '../../../../Base/RemoteImage';
import type { PerpsMarketData } from '../../controllers/types';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { styleSheet } from './PerpsMarketHeader.styles';
import { PerpsMarketHeaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';

interface PerpsMarketHeaderProps {
  market: PerpsMarketData;
  onBackPress?: () => void;
  onMorePress?: () => void;
  testID?: string;
}

const PerpsMarketHeader: React.FC<PerpsMarketHeaderProps> = ({
  market,
  onBackPress,
  onMorePress,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(market.symbol);

  return (
    <View style={styles.container} testID={testID}>
      {/* Back Button */}
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

      {/* Icon Section */}
      <View style={styles.perpIcon}>
        {assetUrl ? (
          <RemoteImage source={{ uri: assetUrl }} style={styles.tokenIcon} />
        ) : (
          <Icon name={IconName.Coin} size={IconSize.Lg} />
        )}
      </View>

      {/* Left Section */}
      <View style={styles.leftSection}>
        <View style={styles.assetRow}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.assetName}
          >
            {market.symbol}-USD
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {market.maxLeverage}
          </Text>
        </View>
        <View style={styles.positionValueRow}>
          <LivePriceHeader
            symbol={market.symbol}
            fallbackPrice={market.price || '0'}
            fallbackChange={market.change24hPercent || '0'}
            testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
            testIDChange={PerpsMarketHeaderSelectorsIDs.CHANGE}
            throttleMs={1000}
          />
        </View>
      </View>

      {/* More Button */}
      {onMorePress && (
        <TouchableOpacity onPress={onMorePress} style={styles.moreButton}>
          <Icon
            name={IconName.MoreVertical}
            size={IconSize.Lg}
            color={IconColor.Default}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PerpsMarketHeader;
