import type { NetworkConfiguration } from '@metamask/network-controller';
import type { Result } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import { awaitTransactionConfirmed } from '../../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { accountSupports7702 } from '../../../../../util/transactions/account-supports-7702';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useEIP7702Accounts } from '../../../../Views/confirmations/hooks/7702/useEIP7702Accounts';
import { useAutoUpgradeEIP7702Account } from '.';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {},
    TransactionController: {
      isAtomicBatchSupported: jest.fn(),
    },
  },
  controllerMessenger: {},
}));

jest.mock(
  '../../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed',
  () => ({
    awaitTransactionConfirmed: jest.fn(),
  }),
);

jest.mock('../../../../../util/transactions/account-supports-7702', () => ({
  accountSupports7702: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectSourceToken: jest.fn(),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock(
  '../../../../Views/confirmations/hooks/7702/useEIP7702Accounts',
  () => ({
    useEIP7702Accounts: jest.fn(),
  }),
);

const ADDRESS = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477' as Hex;
const UPGRADE_ADDRESS = '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b' as Hex;
const OTHER_DELEGATION = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const NETWORK = {
  blockExplorerUrls: [],
  chainId: '0xaa36a7',
  defaultRpcEndpointIndex: 0,
  name: 'Sepolia',
  nativeCurrency: 'SepoliaETH',
  rpcEndpoints: [{ networkClientId: 'sepolia' }],
} as unknown as NetworkConfiguration;
const TRANSACTION_RESULT = {
  result: Promise.resolve('0xhash'),
  transactionMeta: { id: 'transaction-id' },
} as Result;

const mockUpgradeAccount = jest.fn().mockResolvedValue(TRANSACTION_RESULT);
const mockIsAtomicBatchSupported = jest.mocked(
  Engine.context.TransactionController.isAtomicBatchSupported,
);
const mockAccountSupports7702 = jest.mocked(accountSupports7702);
const mockAwaitTransactionConfirmed = jest.mocked(awaitTransactionConfirmed);
const mockUseEIP7702Accounts = jest.mocked(useEIP7702Accounts);
const mockSelectSourceToken = jest.mocked(selectSourceToken);
const mockSelectSourceWalletAddress = jest.mocked(selectSourceWalletAddress);
const mockSelectNetworkConfigurations = jest.mocked(
  selectEvmNetworkConfigurationsByChainId,
);

function runHook() {
  return renderHookWithProvider(() => useAutoUpgradeEIP7702Account(), {}).result
    .current;
}

describe('useAutoUpgradeEIP7702Account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEIP7702Accounts.mockReturnValue({
      downgradeAccount: jest.fn(),
      upgradeAccount: mockUpgradeAccount,
    });
    mockSelectSourceWalletAddress.mockReturnValue(ADDRESS);
    mockSelectSourceToken.mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      chainId: NETWORK.chainId,
      decimals: 18,
      name: 'Sepolia Ether',
      symbol: 'ETH',
    });
    mockSelectNetworkConfigurations.mockReturnValue({
      [NETWORK.chainId]: NETWORK,
    });
    mockAccountSupports7702.mockResolvedValue(true);
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: NETWORK.chainId,
        isSupported: false,
        upgradeContractAddress: UPGRADE_ADDRESS,
      },
    ]);
    mockAwaitTransactionConfirmed.mockImplementation(async ({ submit }) => {
      const submitted = await submit();
      return {
        transactionMeta: submitted.transactionMeta,
        txHash: await submitted.result,
      };
    });
  });

  it('configures account updates to skip approval', () => {
    runHook();

    expect(mockUseEIP7702Accounts).toHaveBeenCalledWith(NETWORK, {
      requireApproval: false,
    });
  });

  it('skips the upgrade when the account is already supported', async () => {
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: NETWORK.chainId,
        delegationAddress: UPGRADE_ADDRESS,
        isSupported: true,
      },
    ]);

    await runHook()();

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockAwaitTransactionConfirmed).not.toHaveBeenCalled();
  });

  it('submits an upgrade and waits for it to be mined', async () => {
    await runHook()();

    expect(mockIsAtomicBatchSupported).toHaveBeenCalledWith({
      address: ADDRESS,
      chainIds: [NETWORK.chainId],
    });
    expect(mockAwaitTransactionConfirmed).toHaveBeenCalledTimes(1);
    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS, UPGRADE_ADDRESS);
  });

  it('re-checks upgrade eligibility before each submission', async () => {
    const autoUpgradeAccount = runHook();

    await autoUpgradeAccount();
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: NETWORK.chainId,
        delegationAddress: UPGRADE_ADDRESS,
        isSupported: true,
      },
    ]);
    await autoUpgradeAccount();

    expect(mockIsAtomicBatchSupported).toHaveBeenCalledTimes(2);
    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('rejects accounts that do not support EIP-7702', async () => {
    mockAccountSupports7702.mockResolvedValue(false);

    await expect(runHook()()).rejects.toThrow(
      'Account does not support EIP-7702',
    );

    expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
  });

  it('rejects a missing network configuration', async () => {
    mockSelectNetworkConfigurations.mockReturnValue({});

    await expect(runHook()()).rejects.toThrow(
      'Network configuration is required for account upgrade',
    );
  });

  it('rejects a network without EIP-7702 support', async () => {
    mockIsAtomicBatchSupported.mockResolvedValue([]);

    await expect(runHook()()).rejects.toThrow(
      'Network does not support EIP-7702',
    );
  });

  it('does not overwrite an unsupported delegation', async () => {
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: NETWORK.chainId,
        delegationAddress: OTHER_DELEGATION,
        isSupported: false,
        upgradeContractAddress: UPGRADE_ADDRESS,
      },
    ]);

    await expect(runHook()()).rejects.toThrow(
      'Account is delegated to an unsupported smart account implementation',
    );

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
  });

  it('rejects when no upgrade contract is available', async () => {
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: NETWORK.chainId,
        isSupported: false,
      },
    ]);

    await expect(runHook()()).rejects.toThrow(
      'EIP-7702 upgrade contract address is unavailable',
    );
  });

  it('propagates transaction confirmation failures', async () => {
    mockAwaitTransactionConfirmed.mockRejectedValue(
      new Error('Transaction failed'),
    );

    await expect(runHook()()).rejects.toThrow('Transaction failed');
  });
});
