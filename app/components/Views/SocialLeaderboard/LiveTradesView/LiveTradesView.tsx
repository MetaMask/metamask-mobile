import React from 'react';
import Animated from 'react-native-reanimated';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import EmptyShellTabPage from '../shell/EmptyShellTabPage';
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
}) => (
  <EmptyShellTabPage
    tab="liveTrades"
    onScroll={onScroll}
    pageRef={pageRef}
    containerTestID={LiveTradesViewSelectorsIDs.CONTAINER}
    scrollTestID={LiveTradesViewSelectorsIDs.SCROLL_VIEW}
  />
);

export default LiveTradesView;
