import React from 'react';
import { render } from '@testing-library/react-native';
import TokenSelectButton from './TokenSelectButton';

describe('TokenSelectButton component', () => {
  it('should Render correctly', () => {
    const dummyHandler = jest.fn();
    const empty = render(<TokenSelectButton label="Select a token" />);
    expect(empty.toJSON()).toMatchSnapshot();
    const eth = render(
      <TokenSelectButton label="Select a token" symbol="ETH" />,
    );
    expect(eth.toJSON()).toMatchSnapshot();
    const symbol = render(
      <TokenSelectButton label="Select a token" symbol="cDAI" />,
    );
    expect(symbol.toJSON()).toMatchSnapshot();
    const icon = render(
      <TokenSelectButton
        label="Select a token"
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
      />,
    );
    expect(icon.toJSON()).toMatchSnapshot();
    const onPress = render(
      <TokenSelectButton
        label="Select a token"
        symbol="DAI"
        icon="https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ"
        onPress={dummyHandler}
      />,
    );
    expect(onPress.toJSON()).toMatchSnapshot();
  });
});
