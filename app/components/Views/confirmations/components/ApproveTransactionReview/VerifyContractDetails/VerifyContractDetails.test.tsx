import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import VerifyContractDetails from './VerifyContractDetails';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const initialState = {
  engine: {
    backgroundState,
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));

describe('VerifyContractDetails', () => {
  it('should show the token symbol', () => {
    const { getByText } = renderWithProvider(
      <VerifyContractDetails
        tokenSymbol={'dummy_token_symbol'}
        closeVerifyContractView={() => undefined}
        savedContactListToArray={[]}
        contractAddress={''}
        tokenAddress={''}
        copyAddress={() => undefined}
        toggleBlockExplorer={() => undefined}
        showNickname={() => undefined}
        tokenStandard={''}
        providerType={''}
        providerRpcTarget={''}
        networkConfigurations={{}}
      />,
      { state: initialState },
    );
    expect(getByText('dummy_token_symbol')).toBeDefined();
  });
});
