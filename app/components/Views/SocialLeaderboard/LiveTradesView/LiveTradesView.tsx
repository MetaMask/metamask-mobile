import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
  IconName,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, {
  Fragment,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { playSelection } from '../../../../util/haptics';
import { strings } from '../../../../../locales/i18n';
import FeedItemRow from '../FeedView/components/FeedItemRow';
import { useFeedNow } from '../FeedView/hooks/useFeedNow';
import type { FeedItem } from '../FeedView/types';
import { getSocialV1FeedEntryDividerTestId } from '../SocialV1View/feed/components/SocialV1FeedPostList.testIds';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { MOCK_LIVE_TRADES_ITEMS } from './mocks/liveTradesFeed.mock';
import LiveStreamStatusDot from './components/LiveStreamStatusDot';
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
}

/**
 * Social Bundle V1 Live trades: compact V0 feed rows until the websocket
 * stream replaces the static fixtures.
 */
const LiveTradesView: React.FC<LiveTradesViewProps> = ({
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const now = useFeedNow({ enabled: true });
  const [streamState, setStreamState] = useState<LiveStreamState>('live');

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
    (item: FeedItem) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL.PROFILE, {
        traderId: item.traderId,
        traderName: item.username,
        traderAddress: item.traderAddress,
        source: 'trader_feed',
      });
    },
    [navigation],
  );

  const handlePositionPress = useCallback(
    (item: FeedItem) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL.POSITION, {
        positionId: item.tokenAvatar.positionId,
        traderId: item.traderId,
        traderAddress: item.traderAddress,
        source: 'trader_feed',
        originalEntryPoint: 'trader_feed',
      });
    },
    [navigation],
  );

  const handleTradePress = useCallback((_item: FeedItem) => {
    // Trade CTA is hidden on Live trades rows; keep handler for API parity.
  }, []);

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={LiveTradesViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Box twClassName="flex-1 px-4 pt-3 pb-2">
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
        </Box>
        <Box twClassName="pr-4 pb-2">
          <ButtonIcon
            iconName={IconName.Filter}
            size={ButtonIconSize.Md}
            onPress={onOpenFilters}
            testID={LiveTradesViewSelectorsIDs.FILTER_BUTTON}
            accessibilityLabel={strings(
              'social_leaderboard.shell.filters.title',
            )}
            twClassName={isFilterActive ? 'bg-background-muted' : undefined}
          />
        </Box>
      </Box>
      <Animated.ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-grow pb-8 pt-2')}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID={LiveTradesViewSelectorsIDs.SCROLL_VIEW}
      >
        {MOCK_LIVE_TRADES_ITEMS.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? (
              <SectionDivider
                marginVertical={1}
                testID={getSocialV1FeedEntryDividerTestId(
                  `live-trades-${index}`,
                )}
              />
            ) : null}
            <FeedItemRow
              item={item}
              now={now}
              showTradeButton={false}
              usePositionCardChrome
              onTradePress={handleTradePress}
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
