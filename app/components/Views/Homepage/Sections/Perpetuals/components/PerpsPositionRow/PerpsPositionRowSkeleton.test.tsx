import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import PerpsPositionRowSkeleton from './PerpsPositionRowSkeleton';

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  return function MockSkeletonPlaceholder({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="skeleton-placeholder">{children}</View>;
  };
});

describe('PerpsPositionRowSkeleton', () => {
  it('renders skeleton placeholder', () => {
    renderWithProvider(<PerpsPositionRowSkeleton />);

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
  });

  it('renders two skeleton rows', () => {
    const { toJSON } = renderWithProvider(<PerpsPositionRowSkeleton />);
    const tree = toJSON();

    expect(tree).not.toBeNull();

    // The skeleton placeholder wrapper should contain 2 row children
    const placeholderNode = tree as { children: unknown[] };
    expect(placeholderNode.children).toHaveLength(2);
  });
});
