import React from 'react';
import { TokenDiscovery } from './';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Mock useNavigation
jest.mock('@react-navigation/native', () => {
  const original = jest.requireActual('@react-navigation/native');
  return {
    ...original,
    useNavigation: jest.fn(),
  };
});

jest.mock('../../UI/Bridge/hooks/useSwapBridgeNavigation', () => {
  const original = jest.requireActual('../../UI/Bridge/hooks/useSwapBridgeNavigation');
  return {
    ...original,
    useSwapBridgeNavigation: jest.fn().mockReturnValue({
      goToSwaps: jest.fn(),
      goToBridge: jest.fn(),
      networkModal: null,
    }),
  };
});

describe('TokenDiscovery', () => {
  it('should render', () => {
    renderWithProvider(<TokenDiscovery />);
    expect(screen.getByText('Popular Tokens')).toBeOnTheScreen();
  });
});

