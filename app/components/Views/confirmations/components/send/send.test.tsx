import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';

import Send from './send';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {},
    },
  }),
}));

describe('Send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = render(<Send />);

    expect(getByText('From:')).toBeTruthy();
    expect(getByText('To:')).toBeTruthy();
    expect(getByText('Value:')).toBeTruthy();
  });

  it('navigate back when cancel is clicked', async () => {
    const { getByText } = render(<Send />);

    fireEvent.press(getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('when confirm is clicked create transaction', async () => {
    const { getByText } = render(<Send />);

    // actual implementation to come here when confirm is implemented
    fireEvent.press(getByText('Confirm'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('asset passed in nav params should be used if present', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { getByText } = render(<Send />);
    expect(getByText('Asset: Ethereum')).toBeTruthy();
  });
});
