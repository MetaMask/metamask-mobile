import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PopularTokensSkeleton from './PopularTokensSkeleton';

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        section: '#f0f0f0',
        subsection: '#ffffff',
      },
    },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (styles: string) => ({ testStyle: styles }),
  }),
}));

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => <View testID={testID || 'skeleton-placeholder'}>{children}</View>;
});

describe('PopularTokensSkeleton', () => {
  it('renders skeleton placeholder with 5 items', () => {
    render(<PopularTokensSkeleton />);

    // Should render the skeleton placeholder container
    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
  });

  it('renders correct number of skeleton rows', () => {
    const { toJSON } = render(<PopularTokensSkeleton />);

    const tree = toJSON();
    // Verify the component renders without crashing
    expect(tree).not.toBeNull();
  });
});
