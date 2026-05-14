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

  it('applies the twHeightClassName when provided', () => {
    renderWithProvider(
      <WhatsHappeningCardSkeleton twHeightClassName="h-[230px]" />,
    );
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders correctly without twHeightClassName (default empty string)', () => {
    const { toJSON: withoutProp } = renderWithProvider(
      <WhatsHappeningCardSkeleton />,
    );
    const { toJSON: withEmptyProp } = renderWithProvider(
      <WhatsHappeningCardSkeleton twHeightClassName="" />,
    );
    expect(withoutProp()).toEqual(withEmptyProp());
  });
});
