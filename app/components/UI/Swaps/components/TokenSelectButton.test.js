import React from 'react';
import { shallow } from 'enzyme';
import TokenSelectButton from './TokenSelectButton';

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
