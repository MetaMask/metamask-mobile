import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { SendContextProvider } from '../../../context/send-context';
import Asset from './asset';

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

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <Asset />
    </SendContextProvider>,
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('Asset', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('Asset: NA')).toBeTruthy();
  });
});
