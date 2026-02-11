import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsDrops from './RewardsDrops';

// Mock the DropsTab component
jest.mock('./DropsTab', () => ({
  DropsTab: function MockDropsTab() {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(View, { testID: 'drops-tab-mock' });
  },
}));

describe('RewardsDrops', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders DropsTab component', () => {
    const { getByTestId } = render(<RewardsDrops />);

    expect(getByTestId('drops-tab-mock')).toBeOnTheScreen();
  });

  it('accepts optional tabLabel prop without errors', () => {
    const { getByTestId } = render(<RewardsDrops tabLabel="Drops" />);

    expect(getByTestId('drops-tab-mock')).toBeOnTheScreen();
  });
});
