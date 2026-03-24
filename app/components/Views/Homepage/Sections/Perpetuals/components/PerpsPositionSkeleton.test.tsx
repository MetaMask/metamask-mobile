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

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { section: '#eee', subsection: '#fff' },
    },
  }),
}));

describe('PerpsPositionSkeleton', () => {
  it('renders skeleton rows', () => {
    render(<PerpsPositionSkeleton />);

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
  });
});
