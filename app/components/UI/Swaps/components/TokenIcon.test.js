import React from 'react';
import { render } from '@testing-library/react-native';
import TokenIcon from './TokenIcon';

describe('TokenIcon component', () => {
  it('should Render correctly', () => {
    const empty = render(<TokenIcon />);
    expect(empty.toJSON()).toMatchSnapshot();
    const eth = render(<TokenIcon symbol="ETH" />);
    expect(eth.toJSON()).toMatchSnapshot();
    const symbol = render(<TokenIcon symbol="cDAI" />);
    expect(symbol.toJSON()).toMatchSnapshot();
    const icon = render(
      <TokenIcon
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
      />,
    );
    expect(icon.toJSON()).toMatchSnapshot();
    const emptyMedium = render(<TokenIcon medium />);
    expect(emptyMedium.toJSON()).toMatchSnapshot();
    const ethMedium = render(<TokenIcon medium symbol="ETH" />);
    expect(ethMedium.toJSON()).toMatchSnapshot();
    const symbolMedium = render(<TokenIcon medium symbol="cDAI" />);
    expect(symbolMedium.toJSON()).toMatchSnapshot();
    const iconMedium = render(
      <TokenIcon
        medium
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
      />,
    );
    expect(iconMedium.toJSON()).toMatchSnapshot();
  });
});
