import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsDrops from './RewardsDrops';

jest.mock('./DropsTab', () => ({
  DropsTab: 'DropsTab',
}));

describe('RewardsDrops', () => {
  it('renders the DropsTab component', () => {
    const { toJSON } = render(<RewardsDrops />);

    expect(toJSON()).not.toBeNull();
  });

  it('renders without tabLabel prop', () => {
    const { toJSON } = render(<RewardsDrops />);

    expect(toJSON()).toBeTruthy();
  });
});
