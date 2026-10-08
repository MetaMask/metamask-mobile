import React from 'react';
import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import SocialFeedPostEntrance from './SocialFeedPostEntrance';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return Reanimated;
});

describe('SocialFeedPostEntrance', () => {
  it('renders children without animating when animate is false', () => {
    renderWithProvider(
      <SocialFeedPostEntrance animate={false}>
        <Text>feed card</Text>
      </SocialFeedPostEntrance>,
    );

    expect(screen.getByText('feed card')).toBeOnTheScreen();
  });

  it('renders children when animate is true', () => {
    renderWithProvider(
      <SocialFeedPostEntrance animate>
        <Text>new post</Text>
      </SocialFeedPostEntrance>,
    );

    expect(screen.getByText('new post')).toBeOnTheScreen();
  });
});
