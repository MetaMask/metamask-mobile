import React from 'react';
import { shallow } from 'enzyme';
import TokenIcon from './TokenIcon';

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

describe('TokenIcon component', () => {
  it('should Render correctly', () => {
    const empty = shallow(<TokenIcon />);
    expect(empty).toMatchSnapshot();
    const eth = shallow(<TokenIcon symbol="ETH" />);
    expect(eth).toMatchSnapshot();
    const symbol = shallow(<TokenIcon symbol="cDAI" />);
    expect(symbol).toMatchSnapshot();
    const icon = shallow(
      <TokenIcon
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
      />,
    );
    expect(icon).toMatchSnapshot();
    const emptyMedium = shallow(<TokenIcon medium />);
    expect(emptyMedium).toMatchSnapshot();
    const ethMedium = shallow(<TokenIcon medium symbol="ETH" />);
    expect(ethMedium).toMatchSnapshot();
    const symbolMedium = shallow(<TokenIcon medium symbol="cDAI" />);
    expect(symbolMedium).toMatchSnapshot();
    const iconMedium = shallow(
      <TokenIcon
        medium
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
      />,
    );
    expect(iconMedium).toMatchSnapshot();
  });
});
