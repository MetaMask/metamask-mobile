import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../util/test/renderWithProvider';
import GasEducationCarousel from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
        }),
      },
    },
  },
};

describe('GasEducationCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <GasEducationCarousel
        navigation={{ getParam: () => false, setOptions: () => null }}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
