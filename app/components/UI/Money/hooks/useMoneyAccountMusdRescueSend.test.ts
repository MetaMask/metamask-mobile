import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import Engine from '../../../../core/Engine';
import { useMoneyAccountMusdRescueSend } from './useMoneyAccountMusdRescueSend';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import Routes from '../../../../constants/navigation/Routes';
import { refreshMoneyAccountBalanceFresh } from '../utils/invalidateMoneyAccountBalanceCaches';
import { useNavigation } from '@react-navigation/native';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

jest.mock('react-redux');
jest.mock('../../../../util/transaction-controller', () => ({
  __esModule: true,
  addTransactionBatch: jest.fn(),
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../utils/invalidateMoneyAccountBalanceCaches', () => ({
  refreshMoneyAccountBalanceFresh: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_DECIMALS: 6,
  MUSD_TOKEN: {
    symbol: 'mUSD',
  },
  MUSD_MONEY_ACCOUNT_CHAIN_IDS: ['0x8f'],
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {
    '0x8f': '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    '0x1': '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  } as Record<string, string>,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockAddTransactionBatch = addTransactionBatch as jest.MockedFunction<
  typeof addTransactionBatch
>;
const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.MockedFunction<
  typeof Engine.context.NetworkController.findNetworkClientIdByChainId
>;
const mockRefreshMoneyAccountBalanceFresh = jest.mocked(
  refreshMoneyAccountBalanceFresh,
);
const mockNavigateToConfirmation = jest.fn();

const MOCK_MONEY_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' as Hex;
const MOCK_RECIPIENT = '0x1234567890123456789012345678901234567891' as Hex;
const MOCK_MUSD_ADDRESS = '0xacA92E438df0B2401fF60dA7E4337B687a2435DA' as Hex;
const MONAD_CHAIN_ID = '0x8f' as Hex;
const MOCK_NETWORK_CLIENT_ID = 'mock-network-client-id';

const MOCK_VAULT_CONFIG = {
  chainId: MONAD_CHAIN_ID,
  boringVault: '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex,
  tellerAddress: '0x86821F179eaD9F0b3C79b2f8deF0227eEBFDc9f9' as Hex,
  accountantAddress: '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex,
  lensAddress: '0x846a7832022350434B5cC006d07cc9c782469660' as Hex,
};

// 100 liquid mUSD in raw units (6 decimals).
const LIQUID_BALANCE_RAW = '100000000';

function setupSelectors({
  // `null` means "no primary money account" — `undefined` would trip the
  // destructuring default above.
  moneyAccount = MOCK_MONEY_ADDRESS,
  vaultConfig = MOCK_VAULT_CONFIG as never,
}: {
  moneyAccount?: string | null;
  vaultConfig?: never;
} = {}) {
  const resolvedMoneyAccount = moneyAccount ?? undefined;
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return resolvedMoneyAccount
        ? ({ address: resolvedMoneyAccount } as never)
        : (undefined as never);
    }
    if (selector === selectMoneyAccountVaultConfig) {
      return vaultConfig;
    }
    return undefined;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAddTransactionBatch.mockResolvedValue({} as never);
  mockFindNetworkClientIdByChainId.mockReturnValue(MOCK_NETWORK_CLIENT_ID);
  mockRefreshMoneyAccountBalanceFresh.mockResolvedValue({
    musdBalance: LIQUID_BALANCE_RAW,
    vmusdValueInMusd: '0',
  } as never);
  jest.mocked(useNavigation).mockReturnValue({
    navigate: mockNavigateToConfirmation,
  } as never);
  setupSelectors();
});

describe('useMoneyAccountMusdRescueSend', () => {
  it('builds a single ERC-20 transfer from the money account to the mUSD contract', async () => {
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await result.current.initiateRescueSend({
      recipient: MOCK_RECIPIENT,
      amount: '1.5',
    });

    expect(mockAddTransactionBatch).toHaveBeenCalledTimes(1);
    const batchArgs = mockAddTransactionBatch.mock.calls[0][0];
    expect(batchArgs.transactions).toHaveLength(1);
    const [tx] = batchArgs.transactions;
    expect(tx.params.to?.toLowerCase()).toBe(MOCK_MUSD_ADDRESS.toLowerCase());
    // ERC-20 transfer(recipient, amount) selector: 0xa9059cbb
    expect(tx.params.data?.startsWith('0xa9059cbb')).toBe(true);
    expect(tx.params.value).toBe('0x0');
    expect(tx.type).toBe(TransactionType.tokenMethodTransfer);
  });

  it('decodes transfer calldata to the recipient and 6-decimal amount', async () => {
    const { ethers } = jest.requireActual('ethers');
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await result.current.initiateRescueSend({
      recipient: MOCK_RECIPIENT,
      amount: '1.5',
    });

    const { data } =
      mockAddTransactionBatch.mock.calls[0][0].transactions[0].params;
    const [decodedRecipient, decodedAmount] = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount)',
    ]).decodeFunctionData('transfer', data);
    expect(decodedRecipient.toLowerCase()).toBe(MOCK_RECIPIENT.toLowerCase());
    // 1.5 mUSD at 6 decimals.
    expect(decodedAmount.toString()).toBe('1500000');
  });

  it('signs from the money account address on the money chain with sponsorship and internal origin', async () => {
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await result.current.initiateRescueSend({
      recipient: MOCK_RECIPIENT,
      amount: '1',
    });

    const batchArgs = mockAddTransactionBatch.mock.calls[0][0];
    expect(batchArgs.from).toBe(MOCK_MONEY_ADDRESS);
    expect(batchArgs.networkClientId).toBe(MOCK_NETWORK_CLIENT_ID);
    expect(mockNavigateToConfirmation).toHaveBeenCalledWith(
      Routes.MONEY.CONFIRMATIONS_ROOT,
      {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: { loader: 'transfer' },
      },
    );
    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledWith(
      MOCK_MONEY_ADDRESS,
    );
    expect(batchArgs.isGasFeeSponsored).toBe(true);
    expect(batchArgs.isInternal).toBe(true);
    expect(batchArgs.origin).toBe(ORIGIN_METAMASK);
    expect(batchArgs.disableHook).toBe(true);
    expect(batchArgs.skipInitialGasEstimate).toBe(true);
  });

  it('blocks with amount-exceeds-balance when amount exceeds the liquid balance', async () => {
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '100.000001',
      }),
    ).rejects.toMatchObject({ reason: 'amount-exceeds-balance' });

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('allows the exact liquid balance as Max', async () => {
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '100',
      }),
    ).resolves.toBeUndefined();

    expect(mockAddTransactionBatch).toHaveBeenCalledTimes(1);
  });

  it('blocks when the fresh canonical balance read fails', async () => {
    mockRefreshMoneyAccountBalanceFresh.mockRejectedValueOnce(
      new Error('fresh balance unavailable'),
    );
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '1',
      }),
    ).rejects.toThrow('fresh balance unavailable');

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
    expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
  });

  it('blocks when any vmUSD-backed balance is present in the fresh canonical response', async () => {
    mockRefreshMoneyAccountBalanceFresh.mockResolvedValueOnce({
      musdBalance: LIQUID_BALANCE_RAW,
      vmusdValueInMusd: '1',
    } as never);
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '1',
      }),
    ).rejects.toMatchObject({ reason: 'vmusd-balance-present' });

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
    expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
  });

  it('revalidates against the latest canonical liquid balance', async () => {
    mockRefreshMoneyAccountBalanceFresh.mockResolvedValueOnce({
      musdBalance: '500000',
      vmusdValueInMusd: '0',
    } as never);
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '1',
      }),
    ).rejects.toMatchObject({ reason: 'amount-exceeds-balance' });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledWith(
      MOCK_MONEY_ADDRESS,
    );
    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
    expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
  });

  it('blocks with invalid-amount for zero and negative amounts', async () => {
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '0',
      }),
    ).rejects.toMatchObject({ reason: 'invalid-amount' });

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '-1',
      }),
    ).rejects.toMatchObject({ reason: 'invalid-amount' });

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('blocks with invalid-recipient for a malformed address', async () => {
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: 'not-an-address',
        amount: '1',
      }),
    ).rejects.toMatchObject({ reason: 'invalid-recipient' });

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('blocks with missing-money-account when no primary money account exists', async () => {
    setupSelectors({ moneyAccount: null });
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '1',
      }),
    ).rejects.toMatchObject({ reason: 'missing-money-account' });

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('blocks with unsupported-chain when mUSD is not deployed on the vault chain', async () => {
    setupSelectors({
      vaultConfig: { ...MOCK_VAULT_CONFIG, chainId: '0x999' } as never,
    });
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '1',
      }),
    ).rejects.toMatchObject({ reason: 'unsupported-chain' });

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('disables sponsorship off Monad', async () => {
    setupSelectors({
      vaultConfig: { ...MOCK_VAULT_CONFIG, chainId: '0x1' } as never,
    });
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await result.current.initiateRescueSend({
      recipient: MOCK_RECIPIENT,
      amount: '1',
    });

    const batchArgs = mockAddTransactionBatch.mock.calls[0][0];
    expect(batchArgs.isGasFeeSponsored).toBe(false);
  });

  it('rethrows initiation failures after logging', async () => {
    const failure = new Error('signing failed');
    mockAddTransactionBatch.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useMoneyAccountMusdRescueSend());

    await expect(
      result.current.initiateRescueSend({
        recipient: MOCK_RECIPIENT,
        amount: '1',
      }),
    ).rejects.toBe(failure);
  });
});
