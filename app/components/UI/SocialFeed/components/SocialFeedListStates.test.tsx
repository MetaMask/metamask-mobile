import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialFeedListState } from '../utils/getSocialFeedListState';
import {
  SocialFeedFooter,
  SocialFeedPlaceholder,
} from './SocialFeedListStates';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import {
  SOCIAL_FEED_EMPTY_TEST_ID,
  SOCIAL_FEED_NEXT_PAGE_TEST_ID,
  SOCIAL_FEED_RETRY_TEST_ID,
} from './SocialFeedStates.testIds';

const NONE: SocialFeedListState = {
  showSkeleton: false,
  showEmpty: false,
  showRetry: false,
};

describe('SocialFeedPlaceholder', () => {
  it('renders the requested number of placeholder posts', () => {
    renderWithProvider(
      <SocialFeedPlaceholder
        state={{ ...NONE, showSkeleton: true }}
        skeletonCount={2}
      />,
    );

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(1)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(getSocialFeedPostSkeletonTestId(2))).toBeNull();
  });

  it('renders the empty state', () => {
    renderWithProvider(
      <SocialFeedPlaceholder state={{ ...NONE, showEmpty: true }} />,
    );

    expect(screen.getByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeOnTheScreen();
  });

  it('renders nothing when neither applies', () => {
    const { toJSON } = renderWithProvider(
      <SocialFeedPlaceholder state={NONE} />,
    );

    expect(toJSON()).toBeNull();
  });
});

describe('SocialFeedFooter', () => {
  it('retries a failed load', () => {
    const onRetry = jest.fn();
    renderWithProvider(
      <SocialFeedFooter
        state={{ ...NONE, showRetry: true }}
        isFetchingNextPage={false}
        onRetry={onRetry}
      />,
    );

    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while the next page loads', () => {
    renderWithProvider(
      <SocialFeedFooter state={NONE} isFetchingNextPage onRetry={jest.fn()} />,
    );

    expect(screen.getByTestId(SOCIAL_FEED_NEXT_PAGE_TEST_ID)).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_FEED_RETRY_TEST_ID)).toBeNull();
  });
});
