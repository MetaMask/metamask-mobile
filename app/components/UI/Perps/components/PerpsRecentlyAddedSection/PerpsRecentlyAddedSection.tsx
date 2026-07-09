import React, { useCallback, useMemo } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SectionHeader } from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import PerpsTokenLogo from '../PerpsTokenLogo/PerpsTokenLogo';
import { formatTimeSinceListing } from '../../utils/time';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import styleSheet from './PerpsRecentlyAddedSection.styles';
import type { PerpsRecentlyAddedSectionProps } from './PerpsRecentlyAddedSection.types';

const PerpsRecentlyAddedTile: React.FC<{
  market: PerpsMarketData;
  onPress: (market: PerpsMarketData) => void;
}> = ({ market, onPress }) => {
  const { styles } = useStyles(styleSheet, {});

  const handlePress = useCallback(() => {
    onPress(market);
  }, [onPress, market]);

  const isPositiveChange = !market.change24h.startsWith('-');
  const changeColor = isPositiveChange ? TextColor.Success : TextColor.Error;

  // Prefer the display name (e.g. "Bitcoin"); fall back to the display symbol
  // when no name is available. Both branches go through getPerpsDisplaySymbol
  // so a HIP-3 `dex:SYMBOL` value (e.g. "xyz:SKHY") never renders with its raw
  // dex prefix, whether it comes from `name` or `symbol`.
  const assetLabel = useMemo(
    () => getPerpsDisplaySymbol(market.name || market.symbol),
    [market.name, market.symbol],
  );

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.tile}
      testID={`perps-recently-added-tile-${market.symbol}`}
      accessibilityRole="button"
      accessibilityLabel={`${market.symbol} recently added market`}
    >
      <View style={styles.logoRow}>
        <PerpsTokenLogo symbol={market.symbol} size={32} />
        {market.listedAt !== undefined && (
          <Text
            variant={TextVariant.BodyXS}
            color={TextColor.Alternative}
            style={styles.timeLabel}
            numberOfLines={1}
          >
            {formatTimeSinceListing(market.listedAt)}
          </Text>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text
          variant={TextVariant.BodySMMedium}
          color={TextColor.Default}
          numberOfLines={1}
        >
          {assetLabel}
        </Text>
        <Text
          variant={TextVariant.BodyXS}
          color={TextColor.Default}
          numberOfLines={1}
        >
          {market.price}
        </Text>
        <Text
          variant={TextVariant.BodyXS}
          color={changeColor}
          numberOfLines={1}
        >
          {market.change24hPercent}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * PerpsRecentlyAddedSection
 *
 * Horizontal scroll rail displaying markets listed in the last 30 days,
 * ordered newest first. Returns null when the list is empty so the section
 * produces no layout gap.
 *
 * Rendered as an entry in PerpsHomeView's `homeSections`, which already
 * renders a SectionDivider before each visible section — this component
 * must not render its own.
 */
const PerpsRecentlyAddedSection: React.FC<PerpsRecentlyAddedSectionProps> = ({
  markets,
  onMarketPress,
}) => {
  const { styles } = useStyles(styleSheet, {});

  if (markets.length === 0) {
    return null;
  }

  return (
    <View testID={PerpsHomeViewSelectorsIDs.RECENTLY_ADDED_SECTION}>
      <SectionHeader
        title={strings('perps.home.recently_added')}
        testID={PerpsHomeViewSelectorsIDs.RECENTLY_ADDED_HEADER}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID={PerpsHomeViewSelectorsIDs.RECENTLY_ADDED_SCROLL}
      >
        {markets.map((market) => (
          <PerpsRecentlyAddedTile
            key={market.symbol}
            market={market}
            onPress={onMarketPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default PerpsRecentlyAddedSection;
