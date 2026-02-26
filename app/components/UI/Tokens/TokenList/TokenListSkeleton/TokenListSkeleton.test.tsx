import React from 'react';
import { render } from '@testing-library/react-native';
import TokenListSkeleton from './TokenListSkeleton';

// Mock the theme hook
jest.mock('../../../../../util/theme', () => {
  const { lightTheme: lt } = jest.requireActual('@metamask/design-tokens');
  return {
    useTheme: () => ({ colors: lt.colors }),
  };
});

describe('TokenListSkeleton', () => {
  it('renders without errors', () => {
    const { root } = render(<TokenListSkeleton />);

    expect(root).toBeDefined();
  });
});
