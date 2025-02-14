import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AssetIcon from './';
const sampleLogo = 'https://s3.amazonaws.com/airswap-token-images/WBTC.png';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        featureFlags: {},
        ipfsGateway: 'https://dweb.link/ipfs/',
        lostIdentities: {},
        selectedAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
        useTokenDetection: true,
        useNftDetection: false,
        showMultiRpcModal: false,
        displayNftMedia: true,
        useSafeChainsListValidation: false,
        isMultiAccountBalancesEnabled: true,
        showTestNetworks: true,
        _U: 0,
        _V: 1,
        _W: {
          featureFlags: {},
          frequentRpcList: [],
          ipfsGateway: 'https://dweb.link/ipfs/',
          lostIdentities: {},
          selectedAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
          useTokenDetection: true,
          useNftDetection: false,
          displayNftMedia: true,
          useSafeChainsListValidation: false,
          isMultiAccountBalancesEnabled: true,
          showTestNetworks: true,
          showIncomingTransactions: {
            '0x1': true,
            '0x5': true,
            '0x38': true,
            '0x61': true,
            '0xa': true,
            '0xa869': true,
            '0x1a4': true,
            '0x89': true,
            '0x13881': true,
            '0xa86a': true,
            '0xfa': true,
            '0xfa2': true,
            '0xaa36a7': true,
            '0xe704': true,
            '0xe708': true,
            '0x504': true,
            '0x507': true,
            '0x505': true,
            '0x64': true,
          },
        },
        _X: null,
      },
    },
  },
};

describe('AssetIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<AssetIcon logo={sampleLogo} />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
