import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, RefreshControl, View } from 'react-native';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import { getCaipChainIdFromAssetId } from '../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import TrendingTokensSkeleton from '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import SectionHeader from '../../components/SectionHeader';
import {
  type ExploreTabName,
  trackExploreInteracted,
} from '../../search/analytics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import WatchlistEmptyFallback from '../../../Homepage/Sections/Watchlist/components/WatchlistEmptyFallback';
import { TokenRowItem } from './TokenRowItem';
import { sortTrendingTokens } from '../../../../UI/Trending/utils/sortTrendingTokens';
import {
  SortDirection,
  TimeOption,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';
import CryptoTokensSortBottomSheet, {
  CRYPTO_TOKENS_SORT_OPTIONS,
  type CryptoTokensSort,
} from './CryptoTokensSortBottomSheet';
import { useTheme } from '../../../../../util/theme';
import { useFloatingTabBarInset } from '../../../../../component-library/components/Navigation/TabBarFloating';
import {
  CRYPTO_WATCHLIST_PILL,
  getCryptoPillOrder,
  type CryptoPillKey,
} from './cryptoPillConfig';
import {
  getEffectiveActiveCryptoPillKey,
  getSelectableCryptoPills,
  getVisibleCryptoPills,
  useCryptoPillFeed,
} from './useCryptoPillFeed';

const SKELETON_COUNT = 8;
const STICKY_HEADER_INDICES = [0];
const STICKY_ROW_KEY = '__crypto-tokens-sticky-header__';

type CryptoTokensListRow =
  | { type: 'sticky' }
  | { type: 'token'; token: TrendingAsset; index: number };

const STICKY_ROW: CryptoTokensListRow = { type: 'sticky' };

/** Pills whose order is the point of the pill; they get no sort row. */
const UNSORTABLE_PILL_KEYS: ReadonlySet<CryptoPillKey> = new Set([
  'gainers',
  'losers',
]);

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
  /** Rendered above the section header; scrolls away (e.g. Top Traders). */
  ListHeaderComponent?: React.ReactElement | null;
  refreshing: boolean;
  onRefresh: () => void;
  /** Test ID of the scrolling list. */
  testID?: string;
}

/**
 * Explore crypto tokens list, laid out like the Perps tab: `ListHeaderComponent`
 * and the Tokens section header scroll away, the pill row (watchlist,
 * trending, top gainers, losers, most traded, plus configured chains) pins
 * as a sticky header, and every token of the selected pill is listed below.
 * Pills whose loaded data falls below their `minItems` are hidden; the active
 * pill falls back to the first selectable one.
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
  ListHeaderComponent,
  refreshing,
  onRefresh,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const floatingTabBarInset = useFloatingTabBarInset();
  const listRef = useRef<FlashListRef<CryptoTokensListRow>>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);

  const pills = useMemo(
    () => getCryptoPillOrder(isWatchlistEnabled),
    [isWatchlistEnabled],
  );

  const defaultPillKey: CryptoPillKey = 'trending';

  const { results } = useCryptoPillFeed({
    activePillKey: activePillKey ?? defaultPillKey,
  });

  const visiblePills = useMemo(
    () => getVisibleCryptoPills(results, isWatchlistEnabled),
    [isWatchlistEnabled, results],
  );

  const selectablePills = useMemo(
    () => getSelectableCryptoPills(results, isWatchlistEnabled),
    [isWatchlistEnabled, results],
  );

  const firstSelectableKey = selectablePills[0]?.key ?? defaultPillKey;
  const isUserKeyVisible =
    activePillKey !== undefined &&
    visiblePills.some((pill) => pill.key === activePillKey);
  const effectiveActiveKey = getEffectiveActiveCryptoPillKey(
    activePillKey,
    visiblePills,
    firstSelectableKey,
    selectablePills,
  );

  useEffect(() => {
    if (
      activePillKey !== undefined &&
      visiblePills.length > 0 &&
      !isUserKeyVisible
    ) {
      onActivePillChange(firstSelectableKey);
    }
  }, [
    activePillKey,
    firstSelectableKey,
    isUserKeyVisible,
    onActivePillChange,
    visiblePills.length,
  ]);

  const activeDefinition = useMemo(
    () =>
      pills.find((pill) => pill.key === effectiveActiveKey) ??
      pills.find((pill) => pill.key === firstSelectableKey) ??
      pills[0],
    [pills, effectiveActiveKey, firstSelectableKey],
  );

  const activeSectionName = activeDefinition?.sectionName ?? 'tokens_trending';

  const handleSelectPill = useCallback(
    (key: string) => {
      onActivePillChange(key as CryptoPillKey);
    },
    [onActivePillChange],
  );

  const renderTokenRow = useCallback(
    (item: TrendingAsset, index: number) => (
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

  const activeResult = results[effectiveActiveKey] ?? {
    data: undefined,
    isLoading: false,
    isError: false,
  };
  const [sort, setSort] = useState<CryptoTokensSort | undefined>();
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const isSortable = !UNSORTABLE_PILL_KEYS.has(effectiveActiveKey);
  const activeItems = useMemo(
    () =>
      sort && isSortable && activeResult.data
        ? sortTrendingTokens(
            activeResult.data,
            sort.option,
            sort.direction,
            TimeOption.TwentyFourHours,
          )
        : activeResult.data,
    [activeResult.data, sort, isSortable],
  );
  const isListLoading =
    activeResult.isLoading ||
    (activeResult.data === undefined && !activeResult.isError);
  const isWatchlistActive = activeDefinition?.key === CRYPTO_WATCHLIST_PILL.key;
  const showWatchlistEmpty =
    isWatchlistActive &&
    !isListLoading &&
    !activeResult.isError &&
    (activeItems?.length ?? 0) === 0;

  const listData = useMemo<CryptoTokensListRow[]>(() => {
    const rows: CryptoTokensListRow[] = [STICKY_ROW];
    if (isListLoading) return rows;
    (activeItems ?? []).forEach((token, index) => {
      rows.push({ type: 'token', token, index });
    });
    return rows;
  }, [activeItems, isListLoading]);

  // Like PerpsMarketList's keepHeaderHiddenOnReset: on a pill change, if the
  // user has scrolled past the header, jump back to the top of the list with
  // the pills still pinned. Skips the first render.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const list = listRef.current;
    if (!list) return;
    const headerHeight = list.getFirstItemOffset();
    if (list.getAbsoluteLastScrollOffset() > headerHeight) {
      list.scrollToOffset({ offset: headerHeight, animated: true });
    }
  }, [effectiveActiveKey]);

  const tokenCount = isListLoading ? 0 : (activeItems?.length ?? 0);
  const sortLabel = sort
    ? strings(
        CRYPTO_TOKENS_SORT_OPTIONS.find(({ option }) => option === sort.option)
          ?.labelKey ?? 'trending.sort_by',
      )
    : strings('trending.sort_by');

  const stickyHeader = (
    <Box twClassName="bg-default" testID={`${testIdPrefix}-sticky-header`}>
      <FilterButtonGroup
        value={effectiveActiveKey}
        onChange={handleSelectPill}
        variant={FilterButtonVariant.Primary}
        twClassName="px-4 pt-4 pb-2"
        testID={`${testIdPrefix}-pills`}
      >
        {visiblePills.map(({ key, labelKey, iconName }) =>
          iconName ? (
            <FilterButton
              key={key}
              value={key}
              startIconName={iconName}
              accessibilityLabel={strings(labelKey)}
              testID={`${testIdPrefix}-pill-${key}`}
              contentWrapperProps={{ gap: 0 }}
              // Icon-only: ButtonBase pads pl-3 pr-4 for a leading icon (expecting a
              // label), which leaves the star off-centre. Equal padding keeps it a 32x32 circle.
              twClassName="px-2"
            >
              {null}
            </FilterButton>
          ) : (
            <FilterButton
              key={key}
              value={key}
              testID={`${testIdPrefix}-pill-${key}`}
            >
              {strings(labelKey)}
            </FilterButton>
          ),
        )}
      </FilterButtonGroup>
      {isSortable && (
        <Box
          twClassName="flex-row items-center justify-between py-1.5 pl-4 pr-1"
          testID={`${testIdPrefix}-sort-row`}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
            testID={`${testIdPrefix}-count`}
          >
            {strings(
              tokenCount === 1
                ? 'trending.crypto_token_count'
                : 'trending.crypto_token_count_plural',
              { count: tokenCount },
            )}
          </Text>
          <SelectButton
            testID={`${testIdPrefix}-sort-button`}
            variant={SelectButtonVariant.Secondary}
            placeholder={sortLabel}
            value={sortLabel}
            onPress={() => setIsSortSheetOpen(true)}
            hideEndArrow
            textProps={{
              variant: TextVariant.BodyMd,
              fontWeight: FontWeight.Medium,
            }}
            endAccessory={
              <Icon
                name={
                  sort?.direction === SortDirection.Ascending
                    ? IconName.Arrow2Up
                    : IconName.Arrow2Down
                }
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
          />
        </Box>
      )}
    </Box>
  );

  const renderItem = ({ item }: { item: CryptoTokensListRow }) =>
    item.type === 'sticky' ? (
      stickyHeader
    ) : (
      <Box twClassName="px-4">{renderTokenRow(item.token, item.index)}</Box>
    );

  const keyExtractor = useCallback(
    (item: CryptoTokensListRow) =>
      item.type === 'sticky'
        ? STICKY_ROW_KEY
        : `${idPrefix}-${item.token.assetId}-${item.index}`,
    [idPrefix],
  );

  const getItemType = useCallback((item: CryptoTokensListRow) => item.type, []);

  if (visiblePills.length === 0) {
    return null;
  }

  const listHeader = (
    <Box testID={testIdPrefix}>
      {ListHeaderComponent}
      <SectionHeader
        title={title}
        onViewAll={() =>
          navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW)
        }
        testID={headerTestID}
        tabName={tabName}
        sectionName={activeSectionName}
      />
    </Box>
  );

  let listFooter: React.ReactElement | null = null;
  if (isListLoading) {
    listFooter = (
      <Box twClassName="px-4" testID="explore-card-list">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <TrendingTokensSkeleton key={`${idPrefix}-skeleton-${i}`} />
        ))}
      </Box>
    );
  } else if (showWatchlistEmpty) {
    listFooter = <WatchlistEmptyFallback />;
  }

  return (
    <>
      <FlashList
        ref={listRef}
        data={listData}
        extraData={`${effectiveActiveKey}|${visiblePills.length}`}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        stickyHeaderIndices={STICKY_HEADER_INDICES}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={tw.style(
          `pt-3 pb-[${16 + floatingTabBarInset}px]`,
        )}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{ disabled: true }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.icon.default}
            colors={[colors.primary.default]}
          />
        }
        testID={testID ?? listTestId}
      />
      {isSortSheetOpen && (
        // Rendered in a Modal, like PerpsTab, so the sheet and backdrop cover
        // the whole screen (above the floating tab bar) instead of being
        // clipped to the tab. Android: wrap <Modal> in a plain <View>.
        <View>
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => setIsSortSheetOpen(false)}
          >
            <ModalSafeAreaProvider>
              <CryptoTokensSortBottomSheet
                sort={sort}
                onApply={setSort}
                onClose={() => setIsSortSheetOpen(false)}
                testID={`${testIdPrefix}-sort-sheet`}
              />
            </ModalSafeAreaProvider>
          </Modal>
        </View>
      )}
    </>
  );
};

export default CryptoTokensPillBlock;
