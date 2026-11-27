import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import SocialFeedError from './SocialFeedError';
import { SOCIAL_FEED_RETRY_TEST_ID } from './SocialFeedStates.testIds';

describe('SocialFeedError', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    announce.mockClear();
  });

  it('shows the error message and retries on press', () => {
    const onRetry = jest.fn();

    renderWithProvider(<SocialFeedError onRetry={onRetry} />);
    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));

    expect(
      screen.getByText(strings('social_leaderboard.feed.error.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('social_leaderboard.feed.error.description')),
    ).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('announces the title to screen readers once when it appears', () => {
    const { rerender } = renderWithProvider(
      <SocialFeedError onRetry={jest.fn()} />,
    );

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      strings('social_leaderboard.feed.error.title'),
    );

    rerender(<SocialFeedError onRetry={jest.fn()} />);

    expect(announce).toHaveBeenCalledTimes(1);
  });
});
