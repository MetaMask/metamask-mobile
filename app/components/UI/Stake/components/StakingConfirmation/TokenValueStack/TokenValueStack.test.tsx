import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TokenValueStack from './TokenValueStack';
import { Image } from 'react-native';
import { TokenValueStackProps } from './TokenValueStack.types';
import { renderFromWei } from '../../../../../../util/number';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('../../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest
  .fn()
  .mockImplementation(
    (_uri: string, success?: (width: number, height: number) => void) => {
      if (success) {
        success(100, 100);
      }
      return Promise.resolve({ width: 100, height: 100 });
    },
  );

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
