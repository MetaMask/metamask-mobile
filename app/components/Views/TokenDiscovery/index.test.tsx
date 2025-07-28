import React from 'react';
import { TokenDiscovery } from './';
import { render, screen } from '@testing-library/react-native';

describe('TokenDiscovery', () => {
  it('should render', () => {
    render(<TokenDiscovery />);
    expect(screen.getByText('Token Discovery placeholder')).toBeOnTheScreen();
  });
});
