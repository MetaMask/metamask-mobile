import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import { useStyles } from '../../../../../../component-library/hooks';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useTheme } from '../../../../../../util/theme';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useSuggestedWatchlistItemsQuery } from '../../hooks/useSuggestedWatchlistItemsQuery';
import { useTokenWatchlistAddItemMutation } from '../../hooks/useTokenWatchlistMutations';
import type { WatchlistTokenWithBalance } from '../../utils/addBalanceToTokens';
import WatchlistDefaultTokenCard from '../WatchlistDefaultTokenCard';
import styleSheet from './WatchlistEmptyCTA.styles';
import { WatchlistEmptyCTATestIds } from './WatchlistEmptyCTA.testIds';

const SKELETON_COUNT = 6;

const getWatchlistAssetType = (assetId: string): 'native' | 'erc20' =>
  assetId.includes('/erc20:') ? 'erc20' : 'native';

interface WatchlistEmptyCTAProps {
  /** Analytics source for watchlist add events. */
  source: string;
}

const WatchlistEmptyCTA: React.FC<WatchlistEmptyCTAProps> = ({ source }) => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: suggestedTokens, isLoading } =
    useSuggestedWatchlistItemsQuery();
  const addMutation = useTokenWatchlistAddItemMutation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set(),
  );
  const initializedForTokensRef = useRef<string>('');

  useEffect(() => {
    if (!suggestedTokens?.length) {
      return;
    }

    const tokenKey = suggestedTokens.map((t) => String(t.assetId)).join(',');
    if (initializedForTokensRef.current === tokenKey) {
      return;
    }

    initializedForTokensRef.current = tokenKey;
    setSelectedAssetIds(
      new Set(suggestedTokens.map((token) => String(token.assetId))),
    );
  }, [suggestedTokens]);

  const handleToggle = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const selectedCount = selectedAssetIds.size;

  const addButtonLabel = useMemo(
    () =>
      selectedCount === 1
        ? strings('token_watchlist.empty_add_tokens_cta', {
            count: selectedCount,
          })
        : strings('token_watchlist.empty_add_tokens_cta_plural', {
            count: selectedCount,
          }),
    [selectedCount],
  );

  const trackAdds = useCallback(
    (tokens: WatchlistTokenWithBalance[]) => {
      for (const token of tokens) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_ADDED)
            .addProperties({
              source,
              asset_type: getWatchlistAssetType(String(token.assetId)),
              has_balance: token.isInWallet,
            })
            .build(),
        );
      }
    },
    [createEventBuilder, source, trackEvent],
  );

  const handleAddPress = useCallback(() => {
    if (!suggestedTokens?.length || selectedCount === 0) {
      return;
    }

    const toAdd = suggestedTokens.filter((token) =>
      selectedAssetIds.has(String(token.assetId)),
    );
    const assetIds = toAdd.map((token) => token.assetId as CaipAssetType);

    addMutation.mutate(assetIds);
    trackAdds(toAdd);
  }, [
    addMutation,
    selectedAssetIds,
    selectedCount,
    suggestedTokens,
    trackAdds,
  ]);

  const gridContent = useMemo(() => {
    if (isLoading) {
      return (
        <View
          style={styles.skeletonGrid}
          testID={WatchlistEmptyCTATestIds.GRID}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <View
              key={`watchlist-empty-skeleton-${index}`}
              style={styles.skeletonCard}
              testID={WatchlistEmptyCTATestIds.SKELETON}
            />
          ))}
        </View>
      );
    }

    if (!suggestedTokens?.length) {
      return null;
    }

    return (
      <View style={styles.grid} testID={WatchlistEmptyCTATestIds.GRID}>
        {suggestedTokens.map((token) => {
          const assetId = String(token.assetId);
          return (
            <View key={assetId} style={styles.gridItem}>
              <WatchlistDefaultTokenCard
                token={token}
                isSelected={selectedAssetIds.has(assetId)}
                onToggle={handleToggle}
              />
            </View>
          );
        })}
      </View>
    );
  }, [
    handleToggle,
    isLoading,
    selectedAssetIds,
    styles.grid,
    styles.gridItem,
    styles.skeletonCard,
    styles.skeletonGrid,
    suggestedTokens,
  ]);

  const footerStyle = useMemo(
    () => ({
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: insets.bottom + 6,
    }),
    [colors.background.default, insets.bottom],
  );

  return (
    <View style={styles.container} testID={WatchlistEmptyCTATestIds.CONTAINER}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {gridContent}
      </ScrollView>
      <View testID="bottomsheetfooter" style={[styles.footer, footerStyle]}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          style={styles.button}
          onPress={handleAddPress}
          isDisabled={selectedCount === 0 || isLoading || addMutation.isPending}
          testID={WatchlistEmptyCTATestIds.ADD_BUTTON}
        >
          {addButtonLabel}
        </Button>
      </View>
    </View>
  );
};

export default WatchlistEmptyCTA;
