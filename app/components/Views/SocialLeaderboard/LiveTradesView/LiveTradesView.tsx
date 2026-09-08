import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useImperativeHandle, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import SubnavPills from '../shell/SubnavPills';
import { SOCIAL_SHELL_TAB_CONFIG } from '../shell/tabConfig';
import type { LiveTradesSubnavId } from '../shell/types';
import { LiveTradesViewSelectorsIDs } from './LiveTradesView.testIds';

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

export interface LiveTradesViewProps {
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
}

/**
 * Social Bundle V1 Live trades shell.
 *
 * The real-time list will be added with the websocket work. TSA-1114 only
 * provides the category navigation and an empty scroll surface.
 */
const LiveTradesView: React.FC<LiveTradesViewProps> = ({
  onScroll,
  pageRef,
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
  const config = SOCIAL_SHELL_TAB_CONFIG.liveTrades;
  const [selectedSubnav, setSelectedSubnav] = useState<LiveTradesSubnavId>(
    config.defaultSubnav,
  );

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={LiveTradesViewSelectorsIDs.CONTAINER}
    >
      <Animated.ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-grow')}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID={LiveTradesViewSelectorsIDs.SCROLL_VIEW}
      >
        <SubnavPills
          items={config.subnav}
          value={selectedSubnav}
          onChange={setSelectedSubnav}
        />
      </Animated.ScrollView>
    </Box>
  );
};

export default LiveTradesView;
