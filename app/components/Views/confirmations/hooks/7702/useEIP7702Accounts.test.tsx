import { NetworkConfiguration } from '@metamask/network-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtil from '../../utils/transaction';
import { EIP7702NetworkConfiguration } from './useEIP7702Networks';
import { useEIP7702Accounts } from './useEIP7702Accounts';
import { TransactionMeta } from '@metamask/transaction-controller';

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

const MOCK_ADDRESS = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';
const MOCK_UPGRADE_ADDRESS = '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B';

function runHook() {
  const { result, rerender } = renderHookWithProvider(
    () => useEIP7702Accounts(MOCK_NETWORK as unknown as NetworkConfiguration),
    {},
  );
  return { result: result.current, rerender };
}

describe('useEIP7702Accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes addTransaction when upgradeAccount is called', () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtil, 'addMMOriginatedTransaction')
      .mockImplementation(() =>
        Promise.resolve({ id: '123' } as unknown as TransactionMeta),
      );
    const { result } = runHook();
    result.upgradeAccount(MOCK_ADDRESS, MOCK_UPGRADE_ADDRESS);
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('invokes addTransaction when downgradeAccount is called', () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtil, 'addMMOriginatedTransaction')
      .mockImplementation(() =>
        Promise.resolve({ id: '123' } as unknown as TransactionMeta),
      );
    const { result } = runHook();
    result.downgradeAccount(MOCK_ADDRESS);
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });
});
