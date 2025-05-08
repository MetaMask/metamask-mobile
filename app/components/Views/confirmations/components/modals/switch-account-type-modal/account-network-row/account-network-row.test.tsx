import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { EIP7702NetworkConfiguration } from '../../../../hooks/useEIP7702Networks';
import AccountNetworkRow from './account-network-row';

const MOCK_NETWORK = {
  chainId: '0xaa36a7',
  delegationAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
  isSupported: true,
  upgradeContractAddress: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
  blockExplorerUrls: [],
  defaultRpcEndpointIndex: 0,
  name: 'Sepolia',
  nativeCurrency: 'SepoliaETH',
  rpcEndpoints: [
    {
      failoverUrls: [],
      networkClientId: 'sepolia',
      type: 'infura',
      url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
    },
  ],
} as unknown as EIP7702NetworkConfiguration;

describe('Account Network Row', () => {
  it('renders correctly for smart account', () => {
    const { getByText } = renderWithProvider(
      <AccountNetworkRow network={MOCK_NETWORK} />,
      {},
    );

    expect(getByText('Smart Account')).toBeTruthy();
    expect(getByText('Switch')).toBeTruthy();
  });

  it('renders correctly for standard account', () => {
    const { getByText } = renderWithProvider(
      <AccountNetworkRow network={{ ...MOCK_NETWORK, isSupported: false }} />,
      {},
    );

    expect(getByText('Standard Account')).toBeTruthy();
    expect(getByText('Switch')).toBeTruthy();
  });
});
