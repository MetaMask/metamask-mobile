import React from 'react';
import { render } from '@testing-library/react-native';
import TokenNetworkFilterBar from './TokenNetworkFilterBar';
import { CaipChainId } from '@metamask/utils';

const mockNetworks: CaipChainId[] = [
  'eip155:1',
  'eip155:10',
  'eip155:137',
] as CaipChainId[];

const mockSetNetworkFilter = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({
    'eip155:1': { name: 'Ethereum Mainnet' },
    'eip155:10': { name: 'Optimism' },
    'eip155:137': { name: 'Polygon' },
  })),
}));

describe('TokenNetworkFilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all networks selected (null)', () => {
    const { toJSON } = render(
      <TokenNetworkFilterBar
        networks={mockNetworks}
        networkFilter={null}
        setNetworkFilter={mockSetNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with all networks selected (empty array)', () => {
    const { toJSON } = render(
      <TokenNetworkFilterBar
        networks={mockNetworks}
        networkFilter={[]}
        setNetworkFilter={mockSetNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with single network selected', () => {
    const { toJSON } = render(
      <TokenNetworkFilterBar
        networks={mockNetworks}
        networkFilter={['eip155:1'] as CaipChainId[]}
        setNetworkFilter={mockSetNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with partial networks selected', () => {
    const { toJSON } = render(
      <TokenNetworkFilterBar
        networks={mockNetworks}
        networkFilter={['eip155:1', 'eip155:10'] as CaipChainId[]}
        setNetworkFilter={mockSetNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
