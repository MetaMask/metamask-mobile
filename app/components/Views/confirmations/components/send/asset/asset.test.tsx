import React from 'react';
import { render } from '@testing-library/react-native';

import Asset from './asset';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        name: 'Ethereum',
      },
    },
  }),
}));

describe('Asset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = render(<Asset />);

    expect(getByText('From:')).toBeTruthy();
    expect(getByText('To:')).toBeTruthy();
    expect(getByText('Amount:')).toBeTruthy();
  });

  it('navigate back when cancel is clicked', async () => {
    const { getByText } = render(<Asset />);

    expect(getByText('Asset: NA')).toBeTruthy();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
