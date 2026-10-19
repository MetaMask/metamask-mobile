import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import SocialFeedError from './SocialFeedError';
import { SOCIAL_FEED_RETRY_TEST_ID } from './SocialFeedStates.testIds';

describe('SocialFeedError', () => {
  it('shows the error message and retries on press', () => {
    const onRetry = jest.fn();

    renderWithProvider(<SocialFeedError onRetry={onRetry} />);
    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));

    expect(
      screen.getByText(strings('social_leaderboard.feed.error.title')),
    ).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
