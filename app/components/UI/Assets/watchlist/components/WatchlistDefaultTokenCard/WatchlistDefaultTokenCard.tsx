import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Checkbox,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import TrendingTokenLogo from '../../../../Trending/components/TrendingTokenLogo';
import {
  getCaipChainIdFromAssetId,
  getNetworkBadgeSource,
} from '../../../../Trending/components/TrendingTokenRowItem/utils';
import { formatPercentChange } from '../../../../Trending/utils/formatPercentChange';
import type { WatchlistTokenWithBalance } from '../../utils/addBalanceToTokens';
import styleSheet from './WatchlistDefaultTokenCard.styles';
import {
  getWatchlistDefaultTokenCardTestId,
  WatchlistDefaultTokenCardTestIds,
} from './WatchlistDefaultTokenCard.testIds';

interface WatchlistDefaultTokenCardProps {
  token: WatchlistTokenWithBalance;
  isSelected: boolean;
  onToggle: (assetId: string) => void;
}

const WatchlistDefaultTokenCard: React.FC<WatchlistDefaultTokenCardProps> = ({
  token,
  isSelected,
  onToggle,
}) => {
  const assetId = String(token.assetId);
  const { styles } = useStyles(styleSheet, { isSelected });

  const networkBadgeSource = useMemo(
    () => getNetworkBadgeSource(getCaipChainIdFromAssetId(assetId)),
    [assetId],
  );

  const { changeLabel, changeTextColor } = useMemo(
    () => formatPercentChange(token.marketData?.pricePercentChange24h),
    [token.marketData?.pricePercentChange24h],
  );

  const handlePress = useCallback(() => {
    onToggle(assetId);
  }, [assetId, onToggle]);

  const handleCheckboxChange = useCallback(() => {
    onToggle(assetId);
  }, [assetId, onToggle]);

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      testID={getWatchlistDefaultTokenCardTestId(assetId)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={token.symbol}
    >
      <View style={styles.topRow}>
        <View style={styles.logoContainer}>
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            badge={
              networkBadgeSource ? (
                <BadgeNetwork
                  src={
                    networkBadgeSource as React.ComponentProps<
                      typeof BadgeNetwork
                    >['src']
                  }
                />
              ) : null
            }
          >
            <TrendingTokenLogo
              assetId={assetId}
              symbol={token.symbol}
              size={40}
              recyclingKey={assetId}
            />
          </BadgeWrapper>
        </View>
        <View style={styles.checkboxContainer}>
          <Checkbox
            testID={`${WatchlistDefaultTokenCardTestIds.CHECKBOX}-${assetId}`}
            isSelected={isSelected}
            onChange={handleCheckboxChange}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        testID={`${WatchlistDefaultTokenCardTestIds.SYMBOL}-${assetId}`}
      >
        {token.symbol}
      </Text>
      {changeLabel ? (
        <Text
          variant={TextVariant.BodySm}
          color={changeTextColor}
          testID={`${WatchlistDefaultTokenCardTestIds.PRICE_CHANGE}-${assetId}`}
        >
          {changeLabel}
        </Text>
      ) : null}
    </Pressable>
  );
};

export default WatchlistDefaultTokenCard;
