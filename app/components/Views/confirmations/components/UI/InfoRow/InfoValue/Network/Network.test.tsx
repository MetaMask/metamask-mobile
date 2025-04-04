import { CHAIN_IDS } from '@metamask/transaction-controller';
import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../../../../../../util/test/network';
import Network from './Network';

const mockInitialState = {
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

describe('Network', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(
      <Network chainId={CHAIN_IDS.MAINNET} />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });
});
