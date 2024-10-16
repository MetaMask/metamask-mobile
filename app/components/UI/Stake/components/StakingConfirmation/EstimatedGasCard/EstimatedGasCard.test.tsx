import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import EstimatedGasCard from './EstimatedGasCard';
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

describe('EstimatedGasCard', () => {
  it('render matches snapshot', () => {
    const props = {
      gasCostEth: '0.0884 ETH',
      gasCostFiat: '$43.56',
    };

    const { getByText, toJSON } = renderWithProvider(
      <EstimatedGasCard {...props} />,
    );

    expect(
      getByText(strings('tooltip_modal.estimated_gas_fee.title')),
    ).toBeDefined();
    expect(getByText(props.gasCostEth)).toBeDefined();
    expect(getByText(props.gasCostFiat)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the estimated gas cost tooltip when pressed', () => {
    const props = {
      gasCostEth: '0.0884 ETH',
      gasCostFiat: '$43.56',
    };

    const { getByLabelText, toJSON } = renderWithProvider(
      <EstimatedGasCard {...props} />,
    );

    fireEvent.press(
      getByLabelText(
        `${strings('tooltip_modal.estimated_gas_fee.title')} tooltip`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      params: {
        title: strings('tooltip_modal.estimated_gas_fee.title'),
        // difficult to directly compare ReactNodes
        tooltip: expect.any(Object),
      },
      screen: 'tooltipModal',
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
