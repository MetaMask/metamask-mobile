import React, { memo } from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import type { PerpsMarketData } from '../../controllers/types';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { styleSheet } from './PerpsAssetInfoCard.styles';

interface PerpsAssetInfoCardProps {
  market: PerpsMarketData;
  testID?: string;
}

/**
 * PerpsAssetInfoCard displays asset information in the content area.
 * This component is shown at the top of the scroll content before scrolling,
 * and fades out as the user scrolls down (header version fades in).
 */
const PerpsAssetInfoCard: React.FC<PerpsAssetInfoCardProps> = ({
  market,
  testID = 'perps-asset-info-card',
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID}>
      {/* Token Logo - larger size for content area */}
      <View style={styles.logoContainer}>
        <PerpsTokenLogo
          symbol={market.symbol}
          size={48}
          style={styles.tokenIcon}
        />
      </View>

      {/* Asset Information Section */}
      <View style={styles.infoSection}>
        {/* Asset Name Row */}
        <View style={styles.assetRow}>
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={styles.assetName}
            testID={`${testID}-name`}
          >
            {getPerpsDisplaySymbol(market.symbol)}-USD
          </Text>
          <PerpsLeverage maxLeverage={market.maxLeverage} />
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <LivePriceHeader
            symbol={market.symbol}
            fallbackPrice={market.price || '0'}
            testIDPrice={`${testID}-price`}
            testIDChange={`${testID}-change`}
            throttleMs={1000}
          />
        </View>
      </View>
    </View>
  );
};

export default memo(PerpsAssetInfoCard);
