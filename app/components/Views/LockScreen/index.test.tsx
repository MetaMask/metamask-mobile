import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import LockScreen from './';

describe('LockScreen', () => {
  it('should render correctly', () => {
    render(<LockScreen />);
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeOnTheScreen();
  });
});
