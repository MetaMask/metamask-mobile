import {
  Box,
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, {
  Fragment,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectFollowingProfileIds } from '../../../../selectors/socialController';
import { playSelection } from '../../../../util/haptics';
import { strings } from '../../../../../locales/i18n';
import { useSocialEntryModeration } from '../components/SocialEntryOptionsBottomSheet';
import { useFeedNow } from '../FeedView/hooks/useFeedNow';
import { getSocialV1FeedEntryDividerTestId } from '../SocialV1View/feed/components/SocialV1FeedPostList.testIds';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import type { SocialShellFilters } from '../shell/filters/types';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import { MOCK_LIVE_TRADES_ITEMS } from './mocks/liveTradesFeed.mock';
import LiveStreamStatusDot from './components/LiveStreamStatusDot';
import LiveTradeRow from './components/LiveTradeRow';
import type { LiveTradeRowModel } from './types';
import { filterLiveTrades } from './utils/filterLiveTrades';
import { LiveTradesViewSelectorsIDs } from './LiveTradesView.testIds';

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

type LiveStreamState = 'paused' | 'live';

export interface LiveTradesViewProps {
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  appliedFilters?: SocialShellFilters;
}

/**
 * Social Bundle V1 Live trades: compact identity + gradient trade cards until
 * the websocket stream replaces the static fixtures.
 */
const LiveTradesView: React.FC<LiveTradesViewProps> = ({
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
  appliedFilters = DEFAULT_FILTERS,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const now = useFeedNow({ enabled: true });
  const [streamState, setStreamState] = useState<LiveStreamState>('live');
  const followingProfileIds = useSelector(selectFollowingProfileIds);
  const { isEntryHidden } = useSocialEntryModeration();
  const visibleItems = useMemo(() => {
    const filtered = filterLiveTrades(
      MOCK_LIVE_TRADES_ITEMS,
      appliedFilters,
      followingProfileIds,
    );
    return filtered.filter(
      (item) =>
        !isEntryHidden({
          postId: item.id,
          authorId: item.traderId,
          authorHandle: item.authorHandle,
        }),
    );
  }, [appliedFilters, followingProfileIds, isEntryHidden]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  const isLive = streamState === 'live';
  const streamLabel = strings(
    isLive
      ? 'social_leaderboard.feed.live_stream.live'
      : 'social_leaderboard.feed.live_stream.paused',
  );

  const handleStreamToggle = useCallback(() => {
    setStreamState((prev) => (prev === 'live' ? 'paused' : 'live'));
  }, []);

  const handleTraderPress = useCallback(
    (item: LiveTradeRowModel) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL.PROFILE, {
        traderId: item.traderId,
        traderName: item.authorHandle,
        traderAddress: item.traderAddress,
        source: 'trader_feed',
      });
    },
    [navigation],
  );

  const handlePositionPress = useCallback(
    (item: LiveTradeRowModel) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL.POSITION, {
        positionId: item.positionId,
        traderId: item.traderId,
        traderAddress: item.traderAddress,
        source: 'trader_feed',
        originalEntryPoint: 'trader_feed',
      });
    },
    [navigation],
  );

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={LiveTradesViewSelectorsIDs.CONTAINER}
    >
      <Animated.ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-grow pb-8')}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID={LiveTradesViewSelectorsIDs.SCROLL_VIEW}
      >
        <SocialTabFilterBar
          onOpenFilters={onOpenFilters}
          isFilterActive={isFilterActive}
          filterTestID={LiveTradesViewSelectorsIDs.FILTER_BUTTON}
        >
          <FilterButton
            isSelected
            variant={FilterButtonVariant.Primary}
            size={FilterButtonSize.Md}
            onPress={handleStreamToggle}
            testID={LiveTradesViewSelectorsIDs.STREAM_BUTTON}
            accessibilityLabel={streamLabel}
            startAccessory={
              <LiveStreamStatusDot isLive={isLive} onPrimaryButton />
            }
          >
            {streamLabel}
          </FilterButton>
        </SocialTabFilterBar>
        {visibleItems.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? (
              <SectionDivider
                marginVertical={1}
                testID={getSocialV1FeedEntryDividerTestId(
                  `live-trades-${index}`,
                )}
              />
            ) : null}
            <LiveTradeRow
              item={item}
              now={now}
              onPositionPress={handlePositionPress}
              onTraderPress={handleTraderPress}
            />
          </Fragment>
        ))}
      </Animated.ScrollView>
    </Box>
  );
};

export default LiveTradesView;
