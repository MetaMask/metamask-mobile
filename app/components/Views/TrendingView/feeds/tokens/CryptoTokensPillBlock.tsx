import React, { useCallback, useEffect, useMemo } from 'react';
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import WatchlistEmptyFallback from '../../../Homepage/Sections/Watchlist/components/WatchlistEmptyFallback';
import { TokenRowItem } from './TokenRowItem';
import {
  CRYPTO_WATCHLIST_PILL,
  getCryptoPillOrder,
  type CryptoPillDefinition,
  type CryptoPillKey,
} from './cryptoPillConfig';
import {
  getEffectiveActiveCryptoPillKey,
  getVisibleCryptoPills,
  useCryptoPillFeed,
} from './useCryptoPillFeed';

const TrendingTokensSingleSkeleton: React.FC = () => <TrendingTokensSkeleton />;

export interface CryptoTokensPillBlockProps {
  title: string;
  /** The user's pill selection. Owned by the parent so pull-to-refresh targets the displayed pill. */
  activePillKey?: CryptoPillKey;
  onActivePillChange: (key: CryptoPillKey) => void;
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
  activePillKey,
  onActivePillChange,
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

  const defaultPillKey = pills[0]?.key ?? 'trending';

  const { results } = useCryptoPillFeed({
    activePillKey: activePillKey ?? defaultPillKey,
  });

  const visiblePills = useMemo(
    () => getVisibleCryptoPills(results, isWatchlistEnabled),
    [isWatchlistEnabled, results],
  );

  const firstVisibleKey = visiblePills[0]?.key ?? defaultPillKey;
  const isUserKeyVisible =
    activePillKey !== undefined &&
    visiblePills.some((pill) => pill.key === activePillKey);
  const effectiveActiveKey = getEffectiveActiveCryptoPillKey(
    activePillKey,
    visiblePills,
    firstVisibleKey,
  );

  useEffect(() => {
    if (
      activePillKey !== undefined &&
      visiblePills.length > 0 &&
      !isUserKeyVisible
    ) {
      onActivePillChange(firstVisibleKey);
    }
  }, [
    activePillKey,
    firstVisibleKey,
    isUserKeyVisible,
    onActivePillChange,
    visiblePills.length,
  ]);

  const activeDefinition = useMemo(
    () =>
      pills.find((pill) => pill.key === effectiveActiveKey) ??
      pills.find((pill) => pill.key === firstVisibleKey) ??
      pills[0],
    [pills, effectiveActiveKey, firstVisibleKey],
  );

  const activeSectionName = activeDefinition?.sectionName ?? 'tokens_trending';

  const handleSelectPill = useCallback(
    (key: string) => {
      onActivePillChange(key as CryptoPillKey);
    },
    [onActivePillChange],
  );

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

  const activeResult = results[effectiveActiveKey] ?? {
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
        activeKey={effectiveActiveKey}
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
