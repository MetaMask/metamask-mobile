import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialFeedSkeleton, {
  SOCIAL_FEED_SKELETON_DEFAULT_COUNT,
} from './SocialFeedSkeleton';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';

describe('SocialFeedSkeleton', () => {
  it('renders the default number of placeholder posts', () => {
    renderWithProvider(<SocialFeedSkeleton />);

    for (let index = 0; index < SOCIAL_FEED_SKELETON_DEFAULT_COUNT; index++) {
      expect(
        screen.getByTestId(getSocialFeedPostSkeletonTestId(index)),
      ).toBeOnTheScreen();
    }
    expect(
      screen.queryByTestId(
        getSocialFeedPostSkeletonTestId(SOCIAL_FEED_SKELETON_DEFAULT_COUNT),
      ),
    ).toBeNull();
  });

  it('puts a divider between placeholders but not before the first', () => {
    renderWithProvider(<SocialFeedSkeleton count={2} />);

    expect(
      screen.queryByTestId(getSocialV1FeedEntryDividerTestId('loading-0')),
    ).toBeNull();
    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('loading-1')),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(getSocialFeedPostSkeletonTestId(2))).toBeNull();
  });
});
