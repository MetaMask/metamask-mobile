import React from 'react';
import { IsAtomicBatchSupportedResult } from '@metamask/transaction-controller';
import { View } from 'react-native';
import { waitFor } from '@testing-library/react-native';

import Text from '../../../../../component-library/components/Texts/Text';
import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import {
  MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
  MOCK_NETWORK_CONTROLLER_STATE,
} from '../../../../../util/test/confirm-data-helpers';
import { RootState } from '../../../../../reducers';
import { useEIP7702Networks } from './useEIP7702Networks';

const mockNetworkBatchSupport = [
  {
    chainId: '0xaa36a7',
    delegationAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
    isSupported: true,
    upgradeContractAddress: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
  },
] as IsAtomicBatchSupportedResult;

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      isAtomicBatchSupported: () => Promise.resolve(mockNetworkBatchSupport),
    },
  },
}));

const MOCK_STATE = {
  engine: {
    backgroundState: {
      NetworkController: MOCK_NETWORK_CONTROLLER_STATE,
      MultichainNetworkController: MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
    },
  },
} as unknown as RootState;

function runHook() {
  const { result, rerender } = renderHookWithProvider(
    () => useEIP7702Networks('0x0'),
    { state: MOCK_STATE },
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
    const { result } = runHook();
    expect(result.pending).toBe(true);
    expect(result.network7702List).toHaveLength(0);
  });

  it('returns list of networks', async () => {
    const { queryByText } = renderWithProvider(<MockComponent />, {
      state: MOCK_STATE,
    });
    await waitFor(() => {
      expect(queryByText('Total networks - 1')).toBeTruthy();
      expect(queryByText('Sepolia')).toBeTruthy();
    });
  });
});
