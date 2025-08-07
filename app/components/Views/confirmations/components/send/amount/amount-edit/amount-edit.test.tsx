import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as MaxAmountUtils from '../../../../hooks/send/useMaxAmount';
// eslint-disable-next-line import/no-namespace
import * as ConversionUtils from '../../../../hooks/send/useCurrencyConversions';
import { SendContextProvider } from '../../../../context/send-context';
import { evmSendStateMock } from '../../../../__mocks__/send.mock';
import { AmountEdit } from './amount-edit';

jest.mock(
  '../../../../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates',
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
      <AmountEdit />
    </SendContextProvider>,
    {
      state: evmSendStateMock,
    },
  );

describe('AmountEdit', () => {
  it('renders correctly', async () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('send_amount')).toBeTruthy();
  });

  it('display option to set value to Max', async () => {
    const { getByText } = renderComponent();

    expect(getByText('Max')).toBeTruthy();
  });

  it('does not display Max option if it is not supported', async () => {
    jest.spyOn(MaxAmountUtils, 'useMaxAmount').mockReturnValue({
      maxAmount: undefined,
      isMaxAmountSupported: false,
      balance: '',
    });
    const { queryByText } = renderComponent();

    expect(queryByText('Max')).toBeNull();
  });

  it('update amount with max value when max button is clicked', async () => {
    const MAX_AMOUNT = '0.01234';
    jest.spyOn(MaxAmountUtils, 'useMaxAmount').mockReturnValue({
      maxAmount: MAX_AMOUNT,
      isMaxAmountSupported: true,
      balance: MAX_AMOUNT.toString(),
    });
    const { getByTestId, getByText } = renderComponent();
    fireEvent.press(getByText('Max'));
    expect(getByTestId('send_amount').props.value).toBe(MAX_AMOUNT);
  });

  it('display option for fiat toggle', async () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('fiat_toggle')).toBeTruthy();
  });

  it('displays fiat value for the amount entered', async () => {
    jest.spyOn(ConversionUtils, 'useCurrencyConversions').mockReturnValue({
      fiatCurrencySymbol: '$',
      getFiatDisplayValue: () => '$ 1200.00',
      getFiatValue: () => 0,
      getNativeDisplayValue: () => '',
      getNativeValue: () => '',
    });
    const { getByTestId, getByText } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '123');
    expect(getByText('$ 1200.00')).toBeDefined();
  });

  it('displays native value for the amount entered if fiat_mode is enabled', async () => {
    jest.spyOn(ConversionUtils, 'useCurrencyConversions').mockReturnValue({
      fiatCurrencySymbol: '$',
      getFiatDisplayValue: () => '',
      getFiatValue: () => 0,
      getNativeDisplayValue: () => 'ETH 0.001',
      getNativeValue: () => '',
    });
    const { getByTestId, getByText } = renderComponent();
    fireEvent.press(getByTestId('fiat_toggle'));
    fireEvent.changeText(getByTestId('send_amount'), '123');
    expect(getByText('ETH 0.001')).toBeDefined();
  });
});
