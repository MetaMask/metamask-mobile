import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
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
import PositionSheetPostRow from './PositionSheetPostRow';
import { useSheetScrollViewport } from './sheetScrollViewport';

const POSTS_TAB_INDEX = 0;

interface PositionSheetTabsProps {
  position: Position | undefined;
  author: SocialV1FeedAuthor;
  /** Price, chart and trade summary. The tab bar sits directly under these. */
  children: React.ReactNode;
}

/**
 * Posts (author comments) and Transactions (fills) for one position. The
 * tab bar stays at the bottom of the first screen, and the active list
 * continues below it. The list always renders, so nothing mounts while the
 * sheet is being dragged, and it scrolls with the sheet.
 */
const PositionSheetTabs: React.FC<PositionSheetTabsProps> = ({
  position,
  author,
  children,
}) => {
  const scrollViewportHeight = useSheetScrollViewport();
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
        showValueAvatar
      />
    ));

  return (
    <>
      <View style={{ minHeight: scrollViewportHeight }}>
        {children}
        <Box testID={PositionDetailsSheetSelectorsIDs.TABS}>
          <TabsBar
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={setActiveIndex}
          />
        </Box>
      </View>
      <Box
        twClassName="mt-3 pb-4"
        testID={
          isPostsTab
            ? PositionDetailsSheetSelectorsIDs.POSTS_LIST
            : PositionDetailsSheetSelectorsIDs.TRANSACTIONS_LIST
        }
      >
        {isPostsTab ? renderPosts() : renderTransactions()}
      </Box>
    </>
  );
};

export default PositionSheetTabs;
