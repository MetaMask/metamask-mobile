import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import SocialFeedPostSkeleton from './SocialFeedPostSkeleton';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';

describe('SocialFeedPostSkeleton', () => {
  it('renders with a stable test id per index', () => {
    renderWithProvider(<SocialFeedPostSkeleton index={2} />);

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(2)),
    ).toBeOnTheScreen();
  });
});
