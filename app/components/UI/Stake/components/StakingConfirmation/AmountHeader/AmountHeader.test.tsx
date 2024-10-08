import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AmountHeader from './AmountHeader';
import { Image } from 'react-native';
import { AmountHeaderProps } from './AmountHeader.types';
import { renderFromWei } from '../../../../../../util/number';

jest.mock('../../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn((_uri, success) => {
  success(100, 100); // Mock successful response for ETH native Icon Image
});

describe('AmountHeader', () => {
  it('render matches snapshot', () => {
    const props: AmountHeaderProps = {
      amountWei: '3210000000000000',
      amountFiat: '7.46',
      tokenSymbol: 'wETH',
    };

    const { getByText, toJSON } = renderWithProvider(
      <AmountHeader {...props} />,
    );

    expect(
      getByText(`${renderFromWei(props.amountWei)} ${props.tokenSymbol}`),
    ).toBeDefined(); // 0.00321 wETH
    expect(getByText(props.amountFiat)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
