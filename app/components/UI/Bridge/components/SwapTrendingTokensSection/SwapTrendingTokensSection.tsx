import React, { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAppThemeFromContext } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import Text from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { TimeOption } from '../../../Trending/components/TrendingTokensBottomSheet';
import TrendingTokensSkeleton from '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokenRowItem from '../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { strings } from '../../../../../../locales/i18n';
import { TrendingAsset } from '@metamask/assets-controllers';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import type { TrendingFilterContext } from '../../../Trending/components/TrendingTokensList/TrendingTokensList';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    title: {
      marginBottom: 12,
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    controlsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      width: '100%',
    },
    controlButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
    },
    wideControlButton: {
      flex: 1,
    },
    timeControlButton: {
      width: 72,
      flexShrink: 0,
    },
    controlButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    controlButtonText: {
      color: theme.colors.text.default,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 19.6,
    },
    listContainer: {
      gap: 0,
    },
    showMoreButton: {
      marginTop: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
    },
    showMoreButtonText: {
      color: theme.colors.primary.default,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 19.6,
    },
  });

interface SwapTrendingTokensSectionProps {
  selectedTimeOption: TimeOption;
  selectedNetworkName: string;
  priceChangeButtonText: string;
  filterContext: TrendingFilterContext;
  trendingTokens: TrendingAsset[];
  isLoading: boolean;
  hasMore: boolean;
  onPriceChangePress: () => void;
  onNetworkPress: () => void;
  onTimePress: () => void;
  onShowMore: () => void;
}

const SwapTrendingTokensSection = ({
  selectedTimeOption,
  selectedNetworkName,
  priceChangeButtonText,
  filterContext,
  trendingTokens,
  isLoading,
  hasMore,
  onPriceChangePress,
  onNetworkPress,
  onTimePress,
  onShowMore,
}: SwapTrendingTokensSectionProps) => {
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.container}
      testID={BridgeViewSelectorsIDs.TRENDING_TOKENS_SECTION}
    >
      <Text style={styles.title}>{strings('trending.trending_tokens')}</Text>
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          testID={BridgeViewSelectorsIDs.TRENDING_PRICE_FILTER}
          onPress={onPriceChangePress}
          style={[styles.controlButton, styles.wideControlButton]}
          activeOpacity={0.2}
        >
          <View style={styles.controlButtonContent}>
            <Text style={styles.controlButtonText}>
              {priceChangeButtonText}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              color={IconColor.Alternative}
              size={IconSize.Xs}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          testID={BridgeViewSelectorsIDs.TRENDING_NETWORK_FILTER}
          onPress={onNetworkPress}
          style={[styles.controlButton, styles.wideControlButton]}
          activeOpacity={0.2}
        >
          <View style={styles.controlButtonContent}>
            <Text style={styles.controlButtonText}>{selectedNetworkName}</Text>
            <Icon
              name={IconName.ArrowDown}
              color={IconColor.Alternative}
              size={IconSize.Xs}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          testID={BridgeViewSelectorsIDs.TRENDING_TIME_FILTER}
          onPress={onTimePress}
          style={[styles.controlButton, styles.timeControlButton]}
          activeOpacity={0.2}
        >
          <View style={styles.controlButtonContent}>
            <Text style={styles.controlButtonText}>{selectedTimeOption}</Text>
            <Icon
              name={IconName.ArrowDown}
              color={IconColor.Alternative}
              size={IconSize.Xs}
            />
          </View>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.listContainer}>
          {Array.from({ length: 6 }).map((_, index) => (
            <TrendingTokensSkeleton key={index} />
          ))}
        </View>
      ) : (
        <View style={styles.listContainer}>
          {trendingTokens.map((token, index) => (
            <TrendingTokenRowItem
              key={`${token.assetId}-${index}`}
              token={token}
              position={index}
              selectedTimeOption={selectedTimeOption}
              filterContext={filterContext}
            />
          ))}
        </View>
      )}
      {!isLoading && hasMore ? (
        <TouchableOpacity
          testID={BridgeViewSelectorsIDs.TRENDING_SHOW_MORE}
          onPress={onShowMore}
          style={styles.showMoreButton}
          activeOpacity={0.2}
        >
          <Text style={styles.showMoreButtonText}>
            {strings('rewards.settings.show_more')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

SwapTrendingTokensSection.displayName = 'SwapTrendingTokensSection';

export default memo(SwapTrendingTokensSection);
