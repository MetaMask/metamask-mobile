import React from 'react';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  COMPOSER_POSTING_DELAY_MS,
  getSocialV1ComposedPosts,
  getSocialV1PendingStartedAtMs,
  resetSocialV1ComposedFeedStore,
  submitSocialV1ComposedPost,
} from '../store/socialV1ComposedFeedStore';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import SocialFeedPostingBanner from './SocialFeedPostingBanner';
import { SocialFeedPostingBannerSelectorsIDs } from './SocialFeedPostingBanner.testIds';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SocialFeedPostingBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    resetSocialV1ComposedFeedStore();
  });

  afterEach(() => {
    resetSocialV1ComposedFeedStore();
    jest.useRealTimers();
  });

  it('fills the posting progress bar over the composer delay', () => {
    renderWithProvider(
      <SocialFeedPostingBanner
        authorHandle="giga-whale"
        startedAtMs={1_000_000}
      />,
    );

    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.AVATAR),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.PROGRESS),
    ).toHaveStyle({ width: '0%' });

    act(() => {
      jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
    });

    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.PROGRESS),
    ).toHaveStyle({ width: '100%' });
  });

  it('renders a remote author avatar when imageUrl is provided', () => {
    renderWithProvider(
      <SocialFeedPostingBanner
        authorHandle="giga-whale"
        authorImageUrl="https://cdn.test/avatar.png"
        startedAtMs={1_000_000}
      />,
    );

    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.AVATAR),
    ).toBeOnTheScreen();
    expect(screen.getByText('giga-whale')).toBeOnTheScreen();
  });

  it('starts the countdown when it mounts before the clock is set', () => {
    submitSocialV1ComposedPost({
      id: 'composed-1',
      authorHandle: 'giga-whale',
      timestampMs: 1_000_000,
      reactions: [],
      item: mockOpenPerpsFeedItem({ comment: 'this is alpha' }),
    });

    expect(getSocialV1PendingStartedAtMs()).toBeNull();

    renderWithProvider(
      <SocialFeedPostingBanner authorHandle="giga-whale" startedAtMs={null} />,
    );

    expect(getSocialV1PendingStartedAtMs()).toBe(1_000_000);
    expect(getSocialV1ComposedPosts()).toHaveLength(0);
  });

  it('commits the queued post when the progress bar completes', () => {
    submitSocialV1ComposedPost({
      id: 'composed-1',
      authorHandle: 'giga-whale',
      timestampMs: 1_000_000,
      reactions: [],
      item: mockOpenPerpsFeedItem({ comment: 'this is alpha' }),
    });

    renderWithProvider(
      <SocialFeedPostingBanner authorHandle="giga-whale" startedAtMs={null} />,
    );

    act(() => {
      jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
    });

    expect(getSocialV1ComposedPosts()[0].id).toBe('composed-1');
  });
});
