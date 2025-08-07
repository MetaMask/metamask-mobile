import React from 'react';

import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SendContextProvider } from '../../../context/send-context';
import Amount from './amount';

jest.mock(
  '../../../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates',
  () => ({
    useGasFeeEstimates: () => ({ gasFeeEstimates: {} }),
  }),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
        name: 'Ethereum',
        address: '0x123',
      },
    },
  }),
}));

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <Amount />
    </SendContextProvider>,
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('Amount', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('Value:')).toBeTruthy();
  });

  it('display option to set value to Max', async () => {
    const { getByText } = renderComponent();

    expect(getByText('Max')).toBeTruthy();
  });
});
