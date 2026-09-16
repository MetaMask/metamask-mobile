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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { strings } from '../../../../../locales/i18n';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
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
 * Social Bundle V1 Live trades shell: Paused/Live chrome plus the filters
 * entry point. The real-time list lands with the websocket work.
 */
const LiveTradesView: React.FC<LiveTradesViewProps> = ({
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
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

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={LiveTradesViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Box twClassName="flex-1 px-4 py-3">
          <FilterButton
            isSelected
            variant={FilterButtonVariant.Primary}
            size={FilterButtonSize.Md}
            onPress={handleStreamToggle}
            testID={LiveTradesViewSelectorsIDs.STREAM_BUTTON}
            accessibilityLabel={streamLabel}
          >
            {streamLabel}
          </FilterButton>
        </Box>
        <Box twClassName="pr-4">
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
        contentContainerStyle={tw.style('flex-grow')}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID={LiveTradesViewSelectorsIDs.SCROLL_VIEW}
      />
    </Box>
  );
};

export default LiveTradesView;
