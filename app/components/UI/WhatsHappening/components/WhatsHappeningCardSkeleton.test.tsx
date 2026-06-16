import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningCardSkeleton from './WhatsHappeningCardSkeleton';

const mockLineStack = jest.fn();

jest.mock('./whatsHappeningSkeletonShared', () => ({
  WhatsHappeningSkeletonShimmer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
  WhatsHappeningSkeletonLineStack: (props: { lineClassNames: string[] }) => {
    mockLineStack(props);
    return null;
  },
}));

describe('WhatsHappeningCardSkeleton', () => {
  beforeEach(() => {
    mockLineStack.mockClear();
  });

  it('renders without crashing', () => {
    renderWithProvider(<WhatsHappeningCardSkeleton />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders a two-line title placeholder and a three-line description placeholder', () => {
    renderWithProvider(<WhatsHappeningCardSkeleton />);

    expect(mockLineStack).toHaveBeenCalledTimes(2);
    const [titleCall, descriptionCall] = mockLineStack.mock.calls;
    expect(titleCall[0].lineClassNames).toHaveLength(2);
    expect(descriptionCall[0].lineClassNames).toHaveLength(3);
  });
});
