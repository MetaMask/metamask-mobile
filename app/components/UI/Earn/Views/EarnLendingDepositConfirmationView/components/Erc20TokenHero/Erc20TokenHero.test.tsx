import React from 'react';
import Erc20TokenHero, { Erc20TokenHeroProps } from './index';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { MOCK_USDC_MAINNET_ASSET } from '../../../../../Stake/__mocks__/stakeMockData';

describe('Erc20TokenHero', () => {
  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  const defaultProps: Erc20TokenHeroProps = {
    token: MOCK_USDC_MAINNET_ASSET,
    amountTokenMinimalUnit: '1000000',
    fiatValue: '1',
  };

  it('renders USDC token correctly', () => {
    const { toJSON } = renderWithProvider(
      <Erc20TokenHero {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
