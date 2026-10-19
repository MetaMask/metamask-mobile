import { NetworkConfiguration } from '@metamask/network-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as TransactionUtil from '../../utils/transaction';
import { EIP7702NetworkConfiguration } from './useEIP7702Networks';
import { useEIP7702Accounts } from './useEIP7702Accounts';
import {
  Result,
  TransactionEnvelopeType,
  TransactionType,
} from '@metamask/transaction-controller';

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

const MOCK_RESULT = {
  result: Promise.resolve('0xhash'),
  transactionMeta: { id: '123' },
} as Result;

function runHook(requireApproval?: boolean) {
  const { result, rerender } = renderHookWithProvider(
    () =>
      useEIP7702Accounts(
        MOCK_NETWORK as unknown as NetworkConfiguration,
        requireApproval === undefined ? undefined : { requireApproval },
      ),
    {},
  );
  return { result: result.current, rerender };
}

describe('useEIP7702Accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires approval by default when upgrading an account', async () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtil, 'addMMOriginatedTransaction')
      .mockResolvedValue(MOCK_RESULT);
    const { result } = runHook();

    await result.upgradeAccount(MOCK_ADDRESS, MOCK_UPGRADE_ADDRESS);

    expect(mockAddTransaction).toHaveBeenCalledWith(
      {
        authorizationList: [{ address: MOCK_UPGRADE_ADDRESS }],
        from: MOCK_ADDRESS,
        to: MOCK_ADDRESS,
        type: TransactionEnvelopeType.setCode,
      },
      {
        networkClientId: 'sepolia',
        requireApproval: true,
        type: TransactionType.batch,
      },
    );
  });

  it('requires approval by default when downgrading an account', async () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtil, 'addMMOriginatedTransaction')
      .mockResolvedValue(MOCK_RESULT);
    const { result } = runHook();

    await result.downgradeAccount(MOCK_ADDRESS);

    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: MOCK_ADDRESS,
        to: MOCK_ADDRESS,
        type: TransactionEnvelopeType.setCode,
      }),
      {
        networkClientId: 'sepolia',
        requireApproval: true,
        type: TransactionType.revokeDelegation,
      },
    );
  });

  it.each(['upgrade', 'downgrade'] as const)(
    'allows %s without approval',
    async (operation) => {
      const mockAddTransaction = jest
        .spyOn(TransactionUtil, 'addMMOriginatedTransaction')
        .mockResolvedValue(MOCK_RESULT);
      const { result } = runHook(false);

      if (operation === 'upgrade') {
        await result.upgradeAccount(MOCK_ADDRESS, MOCK_UPGRADE_ADDRESS);
      } else {
        await result.downgradeAccount(MOCK_ADDRESS);
      }

      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ requireApproval: false }),
      );
    },
  );

  it('returns the complete transaction result', async () => {
    jest
      .spyOn(TransactionUtil, 'addMMOriginatedTransaction')
      .mockResolvedValue(MOCK_RESULT);
    const { result } = runHook(false);

    await expect(
      result.upgradeAccount(MOCK_ADDRESS, MOCK_UPGRADE_ADDRESS),
    ).resolves.toBe(MOCK_RESULT);
  });
});
