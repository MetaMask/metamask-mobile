import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Box,
  FontWeight,
  TabEmptyState,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import type { SocialV1FeedAuthor } from '../../../../UI/SocialFeed/types';
import TradeRow from '../../TraderPositionView/components/TradeRow';
import {
  getPositionPosts,
  getPositionTransactions,
} from '../utils/positionPosts';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import PositionSheetPostRow from './PositionSheetPostRow';

/** About four rows; longer lists scroll inside the sheet. */
export const TAB_BODY_MAX_HEIGHT = 288;

/** Vertical travel that counts as a deliberate expand / collapse swipe. */
export const SWIPE_THRESHOLD = 24;

const POSTS_TAB_INDEX = 0;

interface PositionSheetTabsProps {
  position: Position | undefined;
  author: SocialV1FeedAuthor;
  /** Collapsed, only the tab bar shows so the footer stays in view. */
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
}

/**
 * Posts (author comments) and Transactions (fills) for one position. Tapping
 * a tab opens its list; tapping the open tab again, swiping down on the tab
 * bar or pulling the list down past its top closes it.
 */
const PositionSheetTabs: React.FC<PositionSheetTabsProps> = ({
  position,
  author,
  isExpanded,
  onExpandedChange,
}) => {
  const tw = useTailwind();
  const [activeIndex, setActiveIndex] = useState(POSTS_TAB_INDEX);
  const posts = useMemo(() => getPositionPosts(position), [position]);
  const transactions = useMemo(
    () => getPositionTransactions(position),
    [position],
  );

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'posts',
        label: strings('social_leaderboard.position_sheet.posts_tab', {
          count: posts.length,
        }),
        content: null,
        testID: PositionDetailsSheetSelectorsIDs.POSTS_TAB,
      },
      {
        key: 'transactions',
        label: strings('social_leaderboard.position_sheet.transactions_tab', {
          count: transactions.length,
        }),
        content: null,
        testID: PositionDetailsSheetSelectorsIDs.TRANSACTIONS_TAB,
      },
    ],
    [posts.length, transactions.length],
  );

  const handleTabPress = useCallback(
    (index: number) => {
      if (isExpanded && index === activeIndex) {
        onExpandedChange(false);
        return;
      }
      setActiveIndex(index);
      if (!isExpanded) onExpandedChange(true);
    },
    [isExpanded, activeIndex, onExpandedChange],
  );

  // Downward-only so a swipe on the collapsed bar still drags the sheet.
  const collapseGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(PositionDetailsSheetSelectorsIDs.TABS_COLLAPSE_GESTURE)
        .runOnJS(true)
        .enabled(isExpanded)
        .activeOffsetY(6)
        .failOffsetY(-6)
        .onEnd((event) => {
          if (event.translationY > SWIPE_THRESHOLD) onExpandedChange(false);
        }),
    [isExpanded, onExpandedChange],
  );

  // iOS bounce: pulling the list down past its top closes the tab.
  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (event.nativeEvent.contentOffset.y < -SWIPE_THRESHOLD * 2) {
        onExpandedChange(false);
      }
    },
    [onExpandedChange],
  );

  const isPostsTab = activeIndex === POSTS_TAB_INDEX;

  return (
    <Box testID={PositionDetailsSheetSelectorsIDs.TABS}>
      <GestureDetector gesture={collapseGesture}>
        <Box>
          <TabsBar
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
          />
        </Box>
      </GestureDetector>
      {isExpanded ? (
        <ScrollView
          style={tw.style('mt-3', { maxHeight: TAB_BODY_MAX_HEIGHT })}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={handleScrollEndDrag}
          testID={
            isPostsTab
              ? PositionDetailsSheetSelectorsIDs.POSTS_LIST
              : PositionDetailsSheetSelectorsIDs.TRANSACTIONS_LIST
          }
        >
          {isPostsTab ? (
            posts.length > 0 ? (
              posts.map((post) => (
                <PositionSheetPostRow
                  key={post.uid}
                  post={post}
                  author={author}
                />
              ))
            ) : (
              <Box twClassName="items-center px-4 py-6">
                <TabEmptyState
                  description={strings(
                    'social_leaderboard.position_sheet.no_posts',
                  )}
                  descriptionProps={{
                    color: TextColor.TextAlternative,
                    fontWeight: FontWeight.Medium,
                  }}
                  twClassName="bg-transparent"
                  testID={PositionDetailsSheetSelectorsIDs.POSTS_EMPTY}
                />
              </Box>
            )
          ) : (
            transactions.map((trade, index) => (
              <TradeRow
                key={`${trade.transactionHash}-${trade.timestamp}-${index}`}
                trade={trade}
                action={trade.action}
                traderImageUrl={author.avatarUri ?? undefined}
                traderAddress={author.id}
              />
            ))
          )}
        </ScrollView>
      ) : null}
    </Box>
  );
};

export default PositionSheetTabs;
