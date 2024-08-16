import React from 'react';
import { shallow } from 'enzyme';
import RemoteImage from './';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation(() => 'https://cloudflare-ipfs.com/ipfs/'),
}));

jest.mock('../../../components/hooks/useIpfsGateway', () => jest.fn());

jest.mock('../../../core/Engine', () => ({
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

describe('RemoteImage', () => {
  it('should render svg correctly', () => {
    const wrapper = shallow(
      <RemoteImage
        source={{
          uri: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render static sources', () => {
    const wrapper = shallow(
      <RemoteImage
        source={{
          uri: 'https://s3.amazonaws.com/airswap-token-images/OXT.png',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render ipfs sources', () => {
    const wrapper = shallow(
      <RemoteImage
        source={{
          uri: 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
