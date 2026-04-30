import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkAssetLogo from '.';
import TokenIcon from '../../Base/TokenIcon';
import { ChainId } from '@metamask/controller-utils';

// Mock the TokenIcon component
jest.mock('../../Base/TokenIcon', () => jest.fn(() => null));

describe('NetworkAssetLogo Component', () => {
  it('matches the snapshot for non-mainnet', () => {
    const { toJSON } = render(
      <NetworkAssetLogo
        chainId="42"
        ticker="DAI"
        style={{}}
        big
        biggest={false}
        testID="network-asset-logo"
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders TokenIcon with ETH for mainnet chainId', () => {
    const props = {
      chainId: ChainId.mainnet,
      ticker: 'TEST',
      style: { width: 50, height: 50 },
      big: true,
      biggest: false,
      testID: 'network-asset-logo',
    };

    render(<NetworkAssetLogo {...props} />);

    expect(TokenIcon).toHaveBeenCalledWith(
      {
        big: props.big,
        biggest: props.biggest,
        symbol: 'ETH',
        style: props.style,
        testID: props.testID,
      },
      {},
    );
  });

  it('renders TokenIcon with ticker for non-mainnet chainId', () => {
    const props = {
      chainId: '0x38', // Binance Smart Chain
      ticker: 'BNB',
      style: { width: 40, height: 40 },
      big: false,
      biggest: true,
      testID: 'network-asset-logo',
    };

    render(<NetworkAssetLogo {...props} />);

    expect(TokenIcon).toHaveBeenCalledWith(
      {
        big: props.big,
        biggest: props.biggest,
        symbol: props.ticker,
        style: props.style,
        testID: props.testID,
      },
      {},
    );
  });
});
