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

describe('RemoteImage', () => {
  it('should render svg correctly', () => {
    const { toJSON } = render(
      <RemoteImage
        source={{
          uri: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render static sources', () => {
    const { toJSON } = render(
      <RemoteImage
        source={{
          uri: 'https://s3.amazonaws.com/airswap-token-images/OXT.png',
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render ipfs sources', () => {
    const { toJSON } = render(
      <RemoteImage
        source={{
          uri: 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23',
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
