import React from 'react';
import { merge } from 'lodash';
import { Hex } from '@metamask/utils';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { generateContractInteractionState } from '../../../../../../../util/test/confirm-data-helpers';
import NetworkRow from './network-row';

const CHAIN_ID = '0xe708' as Hex;

const stateWithNetwork = merge({}, generateContractInteractionState, {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          [CHAIN_ID]: {
            name: 'Linea Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'linea-mainnet',
                url: 'https://linea-mainnet.infura.io/v3/test',
                name: 'Linea Mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
  },
});

describe('NetworkRow', () => {
  it('renders the network label and name', () => {
    const { getByText } = renderWithProvider(
      <NetworkRow chainId={CHAIN_ID} />,
      { state: stateWithNetwork },
    );

    expect(getByText('Network')).toBeTruthy();
    expect(getByText('Linea Mainnet')).toBeTruthy();
  });
});
