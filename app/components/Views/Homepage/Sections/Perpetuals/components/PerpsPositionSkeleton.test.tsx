import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsPositionSkeleton from './PerpsPositionSkeleton';

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

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: string[]) => ({ testStyle: args.join(' ') }),
  }),
}));

jest.mock('../../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

describe('PerpsPositionSkeleton', () => {
  it('renders skeleton rows', () => {
    render(<PerpsPositionSkeleton />);

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
  });
});
