import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { getSocialFeedPostSkeletonTestId } from '../../../UI/SocialFeed/components/SocialFeedPostSkeleton.testIds';
import { getSocialV1FeedEntryDividerTestId } from '../../../UI/SocialFeed/components/SocialV1FeedPostList.testIds';
import ProfilePostsLoadingState from './ProfilePostsLoadingState';

describe('ProfilePostsLoadingState', () => {
  it('renders four post skeletons with dividers between them', () => {
    renderWithProvider(<ProfilePostsLoadingState />);

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(3)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getSocialV1FeedEntryDividerTestId('loading-0')),
    ).toBeNull();
    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('loading-1')),
    ).toBeOnTheScreen();
  });
});
