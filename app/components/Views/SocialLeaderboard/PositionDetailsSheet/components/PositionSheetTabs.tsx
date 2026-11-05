import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  FontWeight,
  TabEmptyState,
  TextColor,
} from '@metamask/design-system-react-native';
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
import { sheetHeightDuration } from '../utils/sheetGestureMotion';
import PositionSheetPostRow from './PositionSheetPostRow';

const styles = StyleSheet.create({
  // Measured at its natural height while the clip animates the sheet open.
  listMeasure: { position: 'absolute', left: 0, right: 0 },
});

/** Vertical travel that counts as a deliberate expand swipe. */
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
 * a tab opens its list and the sheet grows by that list's height. The open
 * list scrolls with the sheet, not on its own.
 */
const PositionSheetTabs: React.FC<PositionSheetTabsProps> = ({
  position,
  author,
  isExpanded,
  onExpandedChange,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const listHeight = useSharedValue(0);
  const [measuredListHeight, setMeasuredListHeight] = useState(0);
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

  const handleListLayout = useCallback((event: LayoutChangeEvent) => {
    setMeasuredListHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);

  useEffect(() => {
    const target = isExpanded ? measuredListHeight : 0;
    const duration = sheetHeightDuration(prefersReducedMotion);
    listHeight.value =
      duration === 0
        ? target
        : withTiming(target, {
            duration,
            easing: Easing.out(Easing.cubic),
          });
  }, [isExpanded, listHeight, measuredListHeight, prefersReducedMotion]);

  const listClipStyle = useAnimatedStyle(() => ({
    height: listHeight.value,
    overflow: 'hidden',
  }));

  const isPostsTab = activeIndex === POSTS_TAB_INDEX;

  const renderPosts = () =>
    posts.length > 0 ? (
      posts.map((post) => (
        <PositionSheetPostRow key={post.uid} post={post} author={author} />
      ))
    ) : (
      <Box twClassName="items-center px-4 py-6">
        <TabEmptyState
          description={strings('social_leaderboard.position_sheet.no_posts')}
          descriptionProps={{
            color: TextColor.TextAlternative,
            fontWeight: FontWeight.Medium,
          }}
          twClassName="bg-transparent"
          testID={PositionDetailsSheetSelectorsIDs.POSTS_EMPTY}
        />
      </Box>
    );

  const renderTransactions = () =>
    transactions.map((trade, index) => (
      <TradeRow
        key={`${trade.transactionHash}-${trade.timestamp}-${index}`}
        trade={trade}
        action={trade.action}
        traderImageUrl={author.avatarUri ?? undefined}
        traderAddress={author.id}
      />
    ));

  return (
    <Box testID={PositionDetailsSheetSelectorsIDs.TABS}>
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
      />
      {isExpanded ? (
        <Animated.View style={listClipStyle}>
          <View style={styles.listMeasure} onLayout={handleListLayout}>
            <Box
              twClassName="mt-3"
              testID={
                isPostsTab
                  ? PositionDetailsSheetSelectorsIDs.POSTS_LIST
                  : PositionDetailsSheetSelectorsIDs.TRANSACTIONS_LIST
              }
            >
              {isPostsTab ? renderPosts() : renderTransactions()}
            </Box>
          </View>
        </Animated.View>
      ) : null}
    </Box>
  );
};

export default PositionSheetTabs;
