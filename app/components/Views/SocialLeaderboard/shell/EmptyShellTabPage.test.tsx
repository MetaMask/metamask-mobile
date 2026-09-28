import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import EmptyShellTabPage from './EmptyShellTabPage';
import { MOCK_SOCIAL_V1_FEED_ITEMS } from '../SocialV1View/feed/mocks/socialV1Feed.mock';
import { getSocialFeedPositionCardTestId } from '../SocialV1View/feed/components/SocialFeedPositionCard.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('EmptyShellTabPage', () => {
  it('holds the mock feed back until the tab is opened', () => {
    const { rerender } = renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive={false}
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.queryByTestId(
        getSocialFeedPositionCardTestId(MOCK_SOCIAL_V1_FEED_ITEMS[0].id),
      ),
    ).toBeNull();

    rerender(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(
        getSocialFeedPositionCardTestId(MOCK_SOCIAL_V1_FEED_ITEMS[0].id),
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the mock feed mounted once the tab has been opened', () => {
    const { rerender } = renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    rerender(
      <EmptyShellTabPage
        tab="trending"
        isActive={false}
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(
        getSocialFeedPositionCardTestId(MOCK_SOCIAL_V1_FEED_ITEMS[0].id),
      ),
    ).toBeOnTheScreen();
  });
});
