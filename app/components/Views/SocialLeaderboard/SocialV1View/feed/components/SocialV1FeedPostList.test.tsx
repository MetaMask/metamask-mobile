import React from 'react';
import { Text } from '@metamask/design-system-react-native';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { wrapMockFeedPosts } from '../mocks/wrapMockFeedPosts';
import SocialV1FeedPostList from './SocialV1FeedPostList';
import {
  getSocialV1FeedEntryDividerTestId,
  SOCIAL_V1_FEED_ENTRY_DIVIDER_TEST_ID,
} from './SocialV1FeedPostList.testIds';

describe('SocialV1FeedPostList', () => {
  it('renders a full-width divider between consecutive posts', () => {
    const posts = wrapMockFeedPosts().slice(0, 3);

    renderWithProvider(
      <SocialV1FeedPostList
        posts={posts}
        dividerKeyPrefix="test"
        renderPost={(post) => <Text>{post.id}</Text>}
      />,
    );

    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('test-1')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('test-2')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getSocialV1FeedEntryDividerTestId('test-0')),
    ).toBeNull();
  });

  it('omits dividers when there is only one post', () => {
    const [post] = wrapMockFeedPosts();

    renderWithProvider(
      <SocialV1FeedPostList
        posts={[post]}
        dividerKeyPrefix="solo"
        renderPost={() => <Text>only</Text>}
      />,
    );

    expect(
      screen.queryByTestId(SOCIAL_V1_FEED_ENTRY_DIVIDER_TEST_ID),
    ).toBeNull();
  });
});
