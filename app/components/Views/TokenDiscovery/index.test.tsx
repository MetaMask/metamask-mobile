import React from 'react';
import { TokenDiscovery } from './';
import { render, screen } from '@testing-library/react-native';

// Mock useNavigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('TokenDiscovery', () => {
  it('should render', () => {
    render(<TokenDiscovery />);
    expect(screen.getByText('Popular Tokens')).toBeOnTheScreen();
  });
});

