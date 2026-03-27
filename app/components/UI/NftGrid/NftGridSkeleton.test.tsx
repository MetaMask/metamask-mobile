import React from 'react';
import { render } from '@testing-library/react-native';
import NftGridSkeleton from './NftGridSkeleton';

// Mock the theme hook
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        section: '#f3f5f9',
        subsection: '#ffffff',
      },
    },
  }),
}));

// Mock the tailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args) => {
      if (Array.isArray(args[0])) {
        return args[0].join(' ');
      }
      return args.join(' ');
    }),
  }),
}));

describe('NftGridSkeleton', () => {
  it('renders without errors', () => {
    const { root } = render(<NftGridSkeleton />);

    expect(root).toBeDefined();
  });
});
