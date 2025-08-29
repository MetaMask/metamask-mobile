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
