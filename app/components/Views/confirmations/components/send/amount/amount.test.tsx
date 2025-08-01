import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SendContextProvider } from '../../../context/send-context';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { Amount } from './amount';

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
      state: evmSendStateMock,
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

  it('display option for fiat toggle', async () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('fiat_toggle')).toBeTruthy();
  });
});
