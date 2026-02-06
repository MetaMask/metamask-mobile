import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsSnapshots from './RewardsSnapshots';

// Mock the SnapshotsTab component
jest.mock('./SnapshotsTab', () => ({
  SnapshotsTab: function MockSnapshotsTab() {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(View, { testID: 'snapshots-tab-mock' });
  },
}));

describe('RewardsSnapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders SnapshotsTab component', () => {
    const { getByTestId } = render(<RewardsSnapshots />);

    expect(getByTestId('snapshots-tab-mock')).toBeOnTheScreen();
  });

  it('accepts optional tabLabel prop without errors', () => {
    const { getByTestId } = render(<RewardsSnapshots tabLabel="Snapshots" />);

    expect(getByTestId('snapshots-tab-mock')).toBeOnTheScreen();
  });
});
