import React from 'react';
import { shallow } from 'enzyme';
import TokenIcon from './TokenIcon';

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
