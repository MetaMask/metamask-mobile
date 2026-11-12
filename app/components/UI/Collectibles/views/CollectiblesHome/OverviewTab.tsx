import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { PackHeroSource } from '../../components/CollectiblesDiscovery/PackHeroFlight.geometry';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  FlatList,
  ScrollView,
  type ScrollViewProps,
  type ViewToken,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonVariant,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesHomeTestIds } from '../../Collectibles.testIds';
import type { CollectiblesPack, CollectiblesInventoryCard } from '../../types';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { usePackPartnerOpenings } from '../../providers/pack-partner/hooks/usePackPartnerOpenings';
import { usePackPartnerGreatestHits } from '../../providers/pack-partner/hooks/usePackPartnerGreatestHits';
import {
  usePackInsights,
  usePackSocialContext,
} from '../../hooks/useCollectiblesDiscovery';
import { useCollectiblesLeaderboard } from '../../hooks/useCollectiblesSocial';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import PopularPackCarousel, {
  PopularPackCarouselSkeleton,
} from '../../components/CollectiblesDiscovery/PopularPackCarousel';
import LeaderboardRow from '../../components/CollectiblesDiscovery/LeaderboardRow';
import PackList from '../../components/PackList/PackList';
import ErrorPanel from '../../components/ErrorPanel';
import { getPopularPacks } from './CollectiblesHome.utils';
import CollectiblesSectionHeader from '../../components/CollectiblesDiscovery/CollectiblesSectionHeader';
import CollectiblesLeaderboardSortControl from '../../components/CollectiblesDiscovery/CollectiblesLeaderboardSort';
import type { CollectiblesLeaderboardSort } from '../../services/clients/CollectiblesSocialApiClient';
import CollectiblesShortcuts from './CollectiblesShortcuts';
import PackSocialSummary from '../../components/CollectiblesDiscovery/PackSocialSummary';
import RecentOpeningsRow from '../../components/CollectiblesDiscovery/RecentOpeningsRow';

export type DiscoveryScreen =
  | 'history'
  | 'sales'
  | 'pokedex'
  | 'leaderboard'
  | 'feed'
  | 'profile'
  | 'greatest-hits';
type Section =
  | 'shortcuts'
  | 'hero'
  | 'openings'
  | 'friends'
  | 'hits'
  | 'leaderboard';

/** The Popular landing page: PackPartner discovery with Collectibles API and Social sections. */
const OverviewTab = ({
  bottomInset = 0,
  topInset = 0,
  headerScrollY,
  notices,
  onOpenPack,
  onBuyPack,
  onExplore,
  onSection,
  isObscured = false,
}: {
  onOpenPack: (pack: CollectiblesPack, source?: PackHeroSource) => void;
  onBuyPack?: (pack: CollectiblesPack) => void;
  onExplore?: (screen: DiscoveryScreen, profileId?: string) => void;
  onSection: (section: 'packs' | 'cards' | 'market') => void;
  isObscured?: boolean;
  bottomInset?: number;
  topInset?: number;
  headerScrollY?: Animated.Value;
  notices?: React.ReactElement;
}) => {
  const tw = useTailwind();
  const scrollGesture = useMemo(() => Gesture.Native(), []);
  // FlashList has a non-collapsible outer View. Attach to its actual native
  // ScrollView so the wheel can block scrolling, rather than only that wrapper.
  const renderScrollComponent = useCallback(
    (props: ScrollViewProps & React.RefAttributes<ScrollView>) => (
      <GestureDetector gesture={scrollGesture}>
        <ScrollView {...props} />
      </GestureDetector>
    ),
    [scrollGesture],
  );
  const { bottom } = useSafeAreaInsets();
  const focused = useIsFocused();
  const [heroVisible, setHeroVisible] = useState(true);
  const [openingsVisible, setOpeningsVisible] = useState(false);
  const localScrollY = useRef(new Animated.Value(0)).current;
  const scrollY = headerScrollY ?? localScrollY;
  useEffect(() => {
    scrollY.setValue(0);
  }, [scrollY]);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Section>[] }) => {
      setHeroVisible(viewableItems.some((item) => item.item === 'hero'));
      setOpeningsVisible(
        viewableItems.some((item) => item.item === 'openings'),
      );
    },
  ).current;
  const presentation = useCollectiblesPresentation();
  const { packs, isLoading, error, refetch } = usePackPartnerPacks();
  const packTypes = useMemo(
    () => packs.map((pack) => `pack_partner:${pack.code}`),
    [packs],
  );
  const insights = usePackInsights(packTypes);
  const socialContext = usePackSocialContext(packTypes);
  const [leaderboardSort, setLeaderboardSort] =
    useState<CollectiblesLeaderboardSort>('collectiblesVolume');
  const leaderboard = useCollectiblesLeaderboard(leaderboardSort);
  const [selectedCard, setSelectedCard] = useState<CollectiblesInventoryCard>();
  const active = focused && !isObscured && !selectedCard;
  const openings = usePackPartnerOpenings(
    {},
    { enabled: active && openingsVisible && presentation.online },
  );
  const hits = usePackPartnerGreatestHits(focused && presentation.online);
  const rankedPopular = useMemo(
    () => getPopularPacks(packs, insights.data),
    [packs, insights.data],
  );
  const [popularCodes, setPopularCodes] = useState<string[]>([]);
  const availablePacks = new Map(packs.map((pack) => [pack.code, pack]));
  // Take the best available ranking when a pack first appears. Later activity
  // updates enrich these same slots instead of moving packs under the finger.
  const nextPopularCodes = popularCodes.filter((code) =>
    availablePacks.has(code),
  );
  const retainedCodes = new Set(nextPopularCodes);
  nextPopularCodes.push(
    ...rankedPopular
      .filter((pack) => !retainedCodes.has(pack.code))
      .map((pack) => pack.code),
  );
  if (
    nextPopularCodes.length !== popularCodes.length ||
    nextPopularCodes.some((code, index) => code !== popularCodes[index])
  ) {
    setPopularCodes(nextPopularCodes);
  }
  const popular = nextPopularCodes.flatMap((code) => {
    const pack = availablePacks.get(code);
    return pack ? [pack] : [];
  });
  const friends = useMemo(
    () =>
      packs
        .filter((pack) =>
          Boolean(
            socialContext.data?.[`pack_partner:${pack.code}`]?.friends.length,
          ),
        )
        .sort(
          (a, b) =>
            (socialContext.data?.[`pack_partner:${b.code}`]?.friendOpenings ??
              0) -
            (socialContext.data?.[`pack_partner:${a.code}`]?.friendOpenings ??
              0),
        ),
    [packs, socialContext.data],
  );
  const sections: Section[] = [
    'hero',
    'shortcuts',
    'openings',
    'friends',
    'hits',
    'leaderboard',
  ];
  const cardsRow = (cards: CollectiblesInventoryCard[]) => (
    <FlatList
      horizontal
      data={cards.slice(0, presentation.previewCount)}
      keyExtractor={(card) =>
        'id' in card && typeof card.id === 'string' ? card.id : card.mint
      }
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-3')}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={3}
      renderItem={({ item }) => (
        <Box twClassName="w-40">
          <DiscoveryCard card={item} onPress={setSelectedCard} />
        </Box>
      )}
    />
  );
  return (
    <Box twClassName="flex-1">
      <FlashList<Section>
        renderScrollComponent={renderScrollComponent}
        data={sections}
        keyExtractor={(section) => section}
        getItemType={(section) => section}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 15 }}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={{
          paddingTop: topInset,
          paddingBottom: Math.max(bottom, 16, bottomInset),
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={notices}
        testID={CollectiblesHomeTestIds.OVERVIEW}
        renderItem={({ item }) => {
          if (item === 'shortcuts')
            return <CollectiblesShortcuts onOpen={onSection} />;
          if (item === 'hero')
            return !presentation.online ? null : isLoading ? (
              <PopularPackCarouselSkeleton />
            ) : error && !popular.length ? (
              <ErrorPanel
                title={strings('collectibles.packs.error')}
                onRetry={refetch}
              />
            ) : !popular.length ? (
              <Text
                twClassName="px-4 py-8 text-center"
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.packs.empty')}
              </Text>
            ) : (
              <PopularPackCarousel
                scrollGesture={scrollGesture}
                packs={popular}
                active={heroVisible && active}
                onOpenPack={onOpenPack}
                onBuyPack={onBuyPack ?? onOpenPack}
                socialLoading={socialContext.isPending}
                social={socialContext.data}
                onProfile={(id) => onExplore?.('profile', id)}
              />
            );
          if (item === 'openings')
            return (
              <Box paddingBottom={3}>
                <CollectiblesSectionHeader
                  title={strings('collectibles_discovery.just_opened')}
                />
                {openings.isPending ? (
                  <Skeleton height={200} width="100%" />
                ) : (
                  <RecentOpeningsRow
                    active={active && openingsVisible && presentation.animate}
                    cards={openings.data ?? []}
                    onPause={openings.pause}
                    onResume={openings.resume}
                    limit={presentation.previewCount}
                    onPress={setSelectedCard}
                  />
                )}
                {openings.isError && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    onPress={openings.refresh}
                  >
                    {strings('collectibles_discovery.retry')}
                  </Button>
                )}
                {!openings.isPending && !openings.data?.length && (
                  <Text color={TextColor.TextAlternative} twClassName="px-4">
                    {strings('collectibles_discovery.no_openings')}
                  </Text>
                )}
              </Box>
            );
          if (item === 'friends')
            return (
              <Box>
                <CollectiblesSectionHeader
                  title={strings('collectibles_discovery.popular_friends')}
                />
                <PackList
                  packs={friends.slice(0, presentation.previewCount)}
                  isLoading={
                    isLoading || (packs.length > 0 && socialContext.isPending)
                  }
                  error={Boolean(error)}
                  onRetry={refetch}
                  onOpen={onOpenPack}
                  onBuy={onBuyPack ?? onOpenPack}
                  getOpenedLast7d={(pack) =>
                    insights.data?.[`pack_partner:${pack.code}`]?.openedLast7d
                  }
                  renderSocialContext={(pack) => (
                    <PackSocialSummary
                      context={
                        socialContext.data?.[`pack_partner:${pack.code}`]
                      }
                      onProfile={(id) => onExplore?.('profile', id)}
                      compact
                      isLoading={socialContext.isPending}
                    />
                  )}
                />
              </Box>
            );
          if (item === 'hits')
            return (
              <Box>
                <CollectiblesSectionHeader
                  title={strings('collectibles_discovery.greatest_hits')}
                  onPress={() => onExplore?.('greatest-hits')}
                />
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                  twClassName="px-4 pb-3"
                >
                  {strings('collectibles_discovery.highest_value')}
                </Text>
                {hits.isPending ? (
                  <Skeleton height={200} width="100%" />
                ) : (
                  cardsRow(hits.data ?? [])
                )}
                {hits.isError && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    onPress={() => hits.refetch()}
                  >
                    {strings('collectibles_discovery.retry')}
                  </Button>
                )}
                {!hits.isPending && !hits.data?.length && (
                  <Text color={TextColor.TextAlternative} twClassName="px-4">
                    {strings('collectibles_discovery.no_results')}
                  </Text>
                )}
              </Box>
            );
          return (
            <Box>
              <CollectiblesSectionHeader
                title={strings('collectibles_discovery.leaderboard')}
                onPress={() => onExplore?.('leaderboard')}
                action={
                  <CollectiblesLeaderboardSortControl
                    value={leaderboardSort}
                    onChange={setLeaderboardSort}
                  />
                }
              />
              <Box paddingHorizontal={4}>
                {leaderboard.data?.pages[0]?.items.slice(0, 5).map((entry) => (
                  <LeaderboardRow
                    key={entry.profile.profileId}
                    entry={entry}
                    sort={leaderboardSort}
                    onProfile={(id) => onExplore?.('profile', id)}
                  />
                ))}
              </Box>
            </Box>
          );
        }}
      />
      {selectedCard && (
        <DiscoveryCardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(undefined)}
        />
      )}
    </Box>
  );
};
export default OverviewTab;
