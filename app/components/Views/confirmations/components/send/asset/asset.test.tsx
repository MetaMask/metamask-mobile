import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';

import Asset from './asset';
import { SendContextProvider } from '../../../context/send-context';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {},
    },
  }),
}));

describe('Asset', () => {
  it('renders correctly', async () => {
    const { getByText } = render(<Asset />);

    expect(getByText('Asset: NA')).toBeTruthy();
  });

  it('asset passed in nav params should be used if present', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { queryByText } = render(
      <SendContextProvider>
        <Asset />
      </SendContextProvider>,
    );
    await waitFor(() => {
      expect(queryByText('Asset: Ethereum')).toBeTruthy();
    });
  });
});
