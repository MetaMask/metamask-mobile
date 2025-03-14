import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TokenValueStack from './TokenValueStack';
import { Image } from 'react-native';
import { TokenValueStackProps } from './TokenValueStack.types';
import { renderFromWei } from '../../../../../../util/number';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('../../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn((_uri, success) => {
  success(100, 100); // Mock successful response for ETH native Icon Image
});

describe('TokenValueStack', () => {
  it('render matches snapshot', () => {
    const props: TokenValueStackProps = {
      amountWei: '3210000000000000',
      amountFiat: '7.46',
      tokenSymbol: 'wETH',
    };

    const { getByText, toJSON } = renderWithProvider(
      <TokenValueStack {...props} />,
      {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
            },
          },
        },
      },
    );

    expect(
      getByText(`${renderFromWei(props.amountWei)} ${props.tokenSymbol}`),
    ).toBeDefined(); // 0.00321 wETH
    expect(getByText(props.amountFiat)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
