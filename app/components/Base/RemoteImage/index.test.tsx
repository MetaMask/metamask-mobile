import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import RemoteImage from './';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation(() => 'https://cloudflare-ipfs.com/ipfs/'),
}));

describe('RemoteImage', () => {
  it('should render svg correctly', () => {
    const wrapper = shallow(
      <View>
        <RemoteImage
          source={{
            uri: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
          }}
        />
      </View>,
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
