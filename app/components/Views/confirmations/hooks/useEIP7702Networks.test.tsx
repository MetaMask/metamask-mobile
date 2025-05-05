import React from 'react';
import { IsAtomicBatchSupportedResult } from '@metamask/transaction-controller';
// eslint-disable-next-line import/no-namespace
import * as ReactRedux from 'react-redux';
import { View } from 'react-native';
import { waitFor } from '@testing-library/react-native';

import Text from '../../../../component-library/components/Texts/Text';
import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { useEIP7702Networks } from './useEIP7702Networks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const MOCK_NETWORK_CONFIG = {
  '0xaa36a7': {
    blockExplorerUrls: [],
    chainId: '0xaa36a7',
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
  },
  '0x18c6': {
    blockExplorerUrls: ['https://megaexplorer.xyz'],
    chainId: '0x18c6',
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    name: 'Mega Testnet',
    nativeCurrency: 'MegaETH',
    rpcEndpoints: [
      {
        failoverUrls: [],
        networkClientId: 'megaeth-testnet',
        type: 'custom',
        url: 'https://carrot.megaeth.com/rpc',
      },
    ],
  },
};

const mockNetworkBatchSupport = [
  {
    chainId: '0xaa36a7',
    delegationAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
    isSupported: true,
    upgradeContractAddress: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
  },
] as IsAtomicBatchSupportedResult;

jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      isAtomicBatchSupported: () => Promise.resolve(mockNetworkBatchSupport),
    },
  },
}));

function runHook() {
  const { result, rerender } = renderHookWithProvider(
    () => useEIP7702Networks('0x0'),
    {},
  );
  return { result: result.current, rerender };
}

const MockComponent = () => {
  const { network7702List } = useEIP7702Networks('0x0');
  return (
    <View>
      <Text>{`Total networks - ${network7702List?.length}`}</Text>
      {network7702List?.map(({ name }) => (
        <Text key={name}>{name}</Text>
      ))}
    </View>
  );
};

describe('useEIP7702Networks', () => {
  it('returns pending as true initially', () => {
    jest.spyOn(ReactRedux, 'useSelector').mockReturnValue(MOCK_NETWORK_CONFIG);
    const { result } = runHook();
    expect(result.pending).toBe(true);
    expect(result.network7702List).toHaveLength(0);
  });

  it('returns list of networks', async () => {
    jest.spyOn(ReactRedux, 'useSelector').mockReturnValue(MOCK_NETWORK_CONFIG);
    const { queryByText } = renderWithProvider(<MockComponent />, {});
    await waitFor(() => {
      expect(queryByText('Total networks - 1')).toBeTruthy();
      expect(queryByText('Sepolia')).toBeTruthy();
    });
  });
});
