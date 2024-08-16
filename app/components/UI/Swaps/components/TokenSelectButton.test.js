import React from 'react';
import { shallow } from 'enzyme';
import TokenSelectButton from './TokenSelectButton';

jest.mock('../../../../core/Engine', () => ({
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

describe('TokenSelectButton component', () => {
  it('should Render correctly', () => {
    const dummyHandler = jest.fn();
    const empty = shallow(<TokenSelectButton label="Select a token" />);
    expect(empty).toMatchSnapshot();
    const eth = shallow(
      <TokenSelectButton label="Select a token" symbol="ETH" />,
    );
    expect(eth).toMatchSnapshot();
    const symbol = shallow(
      <TokenSelectButton label="Select a token" symbol="cDAI" />,
    );
    expect(symbol).toMatchSnapshot();
    const icon = shallow(
      <TokenSelectButton
        label="Select a token"
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
      />,
    );
    expect(icon).toMatchSnapshot();
    const onPress = shallow(
      <TokenSelectButton
        label="Select a token"
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
        onPress={dummyHandler}
      />,
    );
    expect(onPress).toMatchSnapshot();
  });
});
