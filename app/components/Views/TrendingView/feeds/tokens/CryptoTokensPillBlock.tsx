import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { ListRenderItem } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import { getCaipChainIdFromAssetId } from '../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import TrendingTokensSkeleton from '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import CardList from '../../components/CardList';
import PillRow, { type PillOption } from '../../components/PillRow';
import SectionHeader from '../../components/SectionHeader';
import {
  type ExploreTabName,
  trackExploreInteracted,
} from '../../search/analytics';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import WatchlistEmptyFallback from '../../../Homepage/Sections/Watchlist/components/WatchlistEmptyFallback';
import { TokenRowItem } from './TokenRowItem';
import {
  CRYPTO_WATCHLIST_PILL,
  getCryptoPillOrder,
  type CryptoPillDefinition,
  type CryptoPillKey,
} from './cryptoPillConfig';
import { useCryptoPillFeed } from './useCryptoPillFeed';

const TrendingTokensSingleSkeleton: React.FC = () => <TrendingTokensSkeleton />;

export interface CryptoTokensPillBlockProps {
  title: string;
  /** Pull-to-refresh wiring from the Explore tab. */
  refresh: RefreshConfig;
  /** Shows the Quick Trade button on token rows when provided. */
  onQuickTrade?: (token: TrendingAsset) => void;
  /** Analytics context. */
  tabName: ExploreTabName;
  /** Test IDs. */
  headerTestID: string;
  idPrefix: string;
  testIdPrefix: string;
  listTestId: string;
}

/**
 * Explore crypto tokens section: a pill row (watchlist, trending, top
 * gainers, top losers, most traded, plus configured chains) above a card
 * list backed by one query per pill. Pills whose loaded data falls below
 * their `minItems` are hidden; the active pill falls back to the first
 * visible one.
 */
const CryptoTokensPillBlock: React.FC<CryptoTokensPillBlockProps> = ({
  title,
  refresh,
  onQuickTrade,
  tabName,
  headerTestID,
  idPrefix,
  testIdPrefix,
  listTestId,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);

  const pills = useMemo(
    () => getCryptoPillOrder(isWatchlistEnabled),
    [isWatchlistEnabled],
  );

  const [activePillKey, setActivePillKey] = useState<CryptoPillKey>(
    pills[0]?.key ?? 'trending',
  );

  const { results } = useCryptoPillFeed({ activePillKey, refresh });

  const visiblePills = useMemo(
    () =>
      pills.filter((pill) => {
        const result = results[pill.key];
        if (!result) return false;
        if (result.isError) return false;
        if (result.data === undefined) return true;
        return result.data.length >= pill.minItems;
      }),
    [pills, results],
  );

  const firstVisibleKey = visiblePills[0]?.key ?? pills[0]?.key ?? 'trending';

  useEffect(() => {
    setActivePillKey((current) =>
      visiblePills.some((pill) => pill.key === current)
        ? current
        : firstVisibleKey,
    );
  }, [firstVisibleKey, visiblePills]);

  const activeDefinition = useMemo(
    () =>
      pills.find((pill) => pill.key === activePillKey) ??
      pills.find((pill) => pill.key === firstVisibleKey) ??
      pills[0],
    [pills, activePillKey, firstVisibleKey],
  );

  const activeSectionName = activeDefinition?.sectionName ?? 'tokens_trending';

  const handleSelectPill = useCallback((key: string) => {
    setActivePillKey(key as CryptoPillKey);
  }, []);

  const renderTokenItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreCryptoTrending}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: tabName,
            section_name: activeSectionName,
            asset_type: 'token',
            position: index,
            token_symbol: item.symbol,
            chain_id: getCaipChainIdFromAssetId(item.assetId),
            item_clicked: item.assetId,
          })
        }
        onQuickTrade={onQuickTrade}
      />
    ),
    [tabName, activeSectionName, onQuickTrade],
  );

  if (visiblePills.length === 0) {
    return null;
  }

  const activeResult = results[activePillKey] ?? {
    data: undefined,
    isLoading: false,
    isError: false,
  };
  const activeItems = activeResult.data ?? [];
  const isListLoading =
    activeResult.isLoading ||
    (activeResult.data === undefined && !activeResult.isError);
  const isWatchlistActive = activeDefinition?.key === CRYPTO_WATCHLIST_PILL.key;
  const showWatchlistEmpty =
    isWatchlistActive &&
    !isListLoading &&
    !activeResult.isError &&
    activeItems.length === 0;

  const pillOptions: PillOption[] = visiblePills.map(
    ({ key, labelKey, iconName }) => ({
      key,
      name: strings(labelKey),
      iconName,
    }),
  );

  return (
    <Box testID={testIdPrefix}>
      <SectionHeader
        title={title}
        onViewAll={() =>
          navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW)
        }
        testID={headerTestID}
        tabName={tabName}
        sectionName={activeSectionName}
      />
      <PillRow
        pills={pillOptions}
        activeKey={activePillKey}
        onSelect={handleSelectPill}
        testIdPrefix={testIdPrefix}
      />
      {showWatchlistEmpty ? (
        <WatchlistEmptyFallback />
      ) : (
        <CardList<TrendingAsset>
          data={activeItems}
          isLoading={isListLoading}
          renderItem={renderTokenItem}
          Skeleton={TrendingTokensSingleSkeleton}
          idPrefix={idPrefix}
          listTestId={listTestId}
          horizontalInset={false}
        />
      )}
    </Box>
  );
};

export default CryptoTokensPillBlock;
