import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialConversationEmptyState from './SocialConversationEmptyState';

describe('SocialConversationEmptyState', () => {
  it('shows the illustration, title, and description', () => {
    renderWithProvider(
      <SocialConversationEmptyState
        title="Start the conversation"
        description="Post a trade. When others copy it, you get 15% of the fees."
        testID="conversation-empty"
      />,
    );

    expect(screen.getByTestId('conversation-empty')).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-conversation-empty-illustration', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Start the conversation')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Post a trade. When others copy it, you get 15% of the fees.',
      ),
    ).toBeOnTheScreen();
  });
});
