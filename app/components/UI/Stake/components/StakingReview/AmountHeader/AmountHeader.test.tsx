import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AmountHeader from './AmountHeader';
import { Image } from 'react-native';

jest.mock('../../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn((_uri, success) => {
  success(100, 100); // Mock successful response for ETH native Icon Image
});

describe('AmountHeader', () => {
  it('render matches snapshot', () => {
    const props = {
      balanceEth: '0.002 wETH',
      balanceFiat: '$66.26',
    };

    const { getByText, toJSON } = renderWithProvider(
      <AmountHeader {...props} />,
    );

    expect(getByText(props.balanceEth)).toBeDefined();
    expect(getByText(props.balanceFiat)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
