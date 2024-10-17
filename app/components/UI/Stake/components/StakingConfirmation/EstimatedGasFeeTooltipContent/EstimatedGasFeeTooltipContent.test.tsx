import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import EstimatedGasFeeTooltipContent from './EstimatedGasFeeTooltipContent';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('EstimatedGasFeeTooltipContent', () => {
  it('render matches snapshot', () => {
    const { getByText, toJSON } = renderWithProvider(
      <EstimatedGasFeeTooltipContent />,
    );

    expect(
      getByText(strings('tooltip_modal.estimated_gas_fee.gas_recipient')),
    ).toBeDefined();
    expect(
      getByText(strings('tooltip_modal.estimated_gas_fee.gas_fluctuation')),
    ).toBeDefined();
    expect(
      getByText(strings('tooltip_modal.estimated_gas_fee.gas_learn_more')),
    ).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('redirects to "learn more about gas fees" web view when learn more pressed', () => {
    const { getByText } = renderWithProvider(<EstimatedGasFeeTooltipContent />);

    fireEvent.press(
      getByText(strings('tooltip_modal.estimated_gas_fee.gas_learn_more')),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      params: {
        url: 'https://support.metamask.io/transactions-and-gas/gas-fees/why-are-my-gas-fees-so-high/',
      },
      screen: 'SimpleWebview',
    });
  });
});
