import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialFeedLoadMoreError from './SocialFeedLoadMoreError';
import { SOCIAL_FEED_LOAD_MORE_RETRY_TEST_ID } from './SocialFeedStates.testIds';

describe('SocialFeedLoadMoreError', () => {
  it('announces the paging error and retries from the button', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const onRetry = jest.fn();
    const message = strings('social_leaderboard.feed.load_more_error');

    renderWithProvider(<SocialFeedLoadMoreError onRetry={onRetry} />);
    fireEvent.press(screen.getByTestId(SOCIAL_FEED_LOAD_MORE_RETRY_TEST_ID));

    const text = screen.getByText(message);
    expect(text).toHaveProp('accessibilityRole', 'alert');
    expect(text).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(announce).toHaveBeenCalledWith(message);
    expect(
      screen.getByText(strings('social_leaderboard.feed.error.retry')),
    ).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
