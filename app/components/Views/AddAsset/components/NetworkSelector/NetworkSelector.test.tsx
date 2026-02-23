import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import NetworkSelector from './NetworkSelector';
import { Hex } from '@metamask/utils';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-uri' })),
}));

const mockOpenNetworkSelector = jest.fn();

const mockNetworkConfigurations = {
  '0x1': {
    chainId: '0x1' as Hex,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    isEvm: true,
    rpcEndpoints: [{ networkClientId: 'mainnet' }],
  },
} as unknown as Record<string, MultichainNetworkConfiguration>;

const mockInitialState = {
  settings: {},
  engine: { backgroundState: { ...backgroundState } },
};

const renderComponent = (selectedNetwork: Hex | null = '0x1') =>
  renderWithProvider(
    <NetworkSelector
      selectedNetwork={selectedNetwork}
      openNetworkSelector={mockOpenNetworkSelector}
      networkConfigurations={mockNetworkConfigurations}
    />,
    { state: mockInitialState },
  );

describe('NetworkSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays selected network name when a network is selected', () => {
    const { getByText } = renderComponent('0x1');
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
  });

  it('displays placeholder text when no network is selected', () => {
    const { getByText, queryByText } = renderComponent(null);

    expect(getByText('Select a network')).toBeOnTheScreen();
    expect(queryByText('Ethereum Mainnet')).toBeNull();
  });

  it('calls openNetworkSelector when pressed', () => {
    const { getByText } = renderComponent('0x1');

    // The Text is a direct child of the TouchableOpacity
    const networkName = getByText('Ethereum Mainnet');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.press(networkName.parent!);

    expect(mockOpenNetworkSelector).toHaveBeenCalledTimes(1);
  });
});
