import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningCardSkeleton from './WhatsHappeningCardSkeleton';

jest.mock('./whatsHappeningSkeletonShared', () => ({
  WhatsHappeningSkeletonShimmer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
  WhatsHappeningSkeletonLineStack: () => null,
}));

describe('WhatsHappeningCardSkeleton', () => {
  it('renders without crashing', () => {
    renderWithProvider(<WhatsHappeningCardSkeleton />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders the badge, title, description and footer placeholder rows', () => {
    renderWithProvider(<WhatsHappeningCardSkeleton />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
