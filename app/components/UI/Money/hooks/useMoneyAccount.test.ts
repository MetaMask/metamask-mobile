import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { WalletDevice } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdraw,
} from '../utils/moneyAccountTransactions';
import {
  useMoneyAccountDeposit,
  useMoneyAccountWithdrawal,
} from './useMoneyAccount';

jest.mock('react-redux');
jest.mock('../../../../util/transaction-controller');
jest.mock('../../../../util/notifications/methods/common');
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
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
jest.mock('../utils/moneyAccountTransactions');
jest.mock(
  '../../../Views/confirmations/components/confirm/confirm-component',
  () => ({
    ConfirmationLoader: { CustomAmount: 'customAmount' },
  }),
);

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn().mockReturnValue({
    navigateToConfirmation: jest.fn(),
  }),
}));

const mockUseConfirmNavigation = useConfirmNavigation as jest.MockedFunction<
  typeof useConfirmNavigation
>;

const getNavigateToConfirmation = () =>
  mockUseConfirmNavigation.mock.results[0]?.value
    .navigateToConfirmation as jest.Mock;

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetProviderByChainId = getProviderByChainId as jest.MockedFunction<
  typeof getProviderByChainId
>;
const mockAddTransactionBatch = addTransactionBatch as jest.MockedFunction<
  typeof addTransactionBatch
>;
const mockAddTransaction = addTransaction as jest.MockedFunction<
  typeof addTransaction
>;
const mockBuildDepositBatch =
  buildMoneyAccountDepositBatch as jest.MockedFunction<
    typeof buildMoneyAccountDepositBatch
  >;
const mockBuildWithdraw = buildMoneyAccountWithdraw as jest.MockedFunction<
  typeof buildMoneyAccountWithdraw
>;
const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.MockedFunction<
  typeof Engine.context.NetworkController.findNetworkClientIdByChainId
>;

const MOCK_VAULT_CONFIG = {
  chainId: '0xa4b1',
  boringVault: '0xboringVault',
  tellerAddress: '0xteller',
  accountantAddress: '0xaccountant',
  lensAddress: '0xlens',
};

const MOCK_MONEY_ACCOUNT = {
  address: '0xmoneyAccount',
};

const MOCK_PROVIDER = {} as ReturnType<typeof getProviderByChainId>;

// useMoneyAccountContext calls useSelector twice per render in order:
//   odd calls  → selectMoneyAccountVaultConfig
//   even calls → selectPrimaryMoneyAccount
// useConfirmNavigation is fully mocked so it never calls useSelector.
//
// 'key' in options is used instead of destructuring defaults so that
// an explicit { vaultConfig: undefined } is treated as "use undefined",
// not "use the default" (JS destructuring defaults apply for undefined values).
interface SelectorOptions {
  vaultConfig?: typeof MOCK_VAULT_CONFIG | undefined;
  primaryMoneyAccount?: typeof MOCK_MONEY_ACCOUNT | undefined;
}

function setupSelectors(options: SelectorOptions = {}) {
  const vaultConfig =
    'vaultConfig' in options ? options.vaultConfig : MOCK_VAULT_CONFIG;
  const primaryMoneyAccount =
    'primaryMoneyAccount' in options
      ? options.primaryMoneyAccount
      : MOCK_MONEY_ACCOUNT;
  let callCount = 0;
  mockUseSelector.mockImplementation(() => {
    callCount++;
    return callCount % 2 === 1 ? vaultConfig : primaryMoneyAccount;
  });
}

describe('useMoneyAccountDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
    mockGetProviderByChainId.mockReturnValue(MOCK_PROVIDER);
    mockFindNetworkClientIdByChainId.mockReturnValue('arbitrum-one');
    mockBuildDepositBatch.mockResolvedValue({
      approveTx: {
        params: {
          to: '0xtoken' as Hex,
          data: '0xapprove' as Hex,
          value: '0x0' as Hex,
        },
        type: 'tokenMethodApprove' as never,
      },
      depositTx: {
        params: {
          to: '0xteller' as Hex,
          data: '0xdeposit' as Hex,
          value: '0x0' as Hex,
        },
        type: 'moneyAccountDeposit' as never,
      },
    });
    mockAddTransactionBatch.mockResolvedValue({} as never);
  });

  it('does not build transaction when vault config is missing', async () => {
    setupSelectors({ vaultConfig: undefined });

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit(BigInt(1_000_000));
    });

    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
  });

  it('logs error and returns when provider is unavailable', async () => {
    mockGetProviderByChainId.mockReturnValue(undefined as never);

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit(BigInt(1_000_000));
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('No provider available'),
      }),
    );
    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
  });

  it('builds deposit batch, navigates, and submits transaction', async () => {
    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit(BigInt(1_000_000));
    });

    expect(mockBuildDepositBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(1_000_000),
        chainId: MOCK_VAULT_CONFIG.chainId,
        boringVault: MOCK_VAULT_CONFIG.boringVault,
      }),
    );

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.MONEY.ROOT,
    });

    expect(mockAddTransactionBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        from: MOCK_MONEY_ACCOUNT.address,
        networkClientId: 'arbitrum-one',
        origin: ORIGIN_METAMASK,
        disableHook: true,
        disableSequential: true,
      }),
    );
  });

  it('logs error when addTransactionBatch fails', async () => {
    const txError = new Error('batch submission failed');
    mockAddTransactionBatch.mockRejectedValue(txError);

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit(BigInt(1_000_000));
    });

    expect(Logger.error).toHaveBeenCalledWith(
      txError,
      '[Money Account] Deposit transaction failed',
    );
  });
});

describe('useMoneyAccountWithdrawal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
    mockGetProviderByChainId.mockReturnValue(MOCK_PROVIDER);
    mockFindNetworkClientIdByChainId.mockReturnValue('arbitrum-one');
    mockBuildWithdraw.mockResolvedValue({
      params: {
        to: '0xteller' as Hex,
        data: '0xwithdraw' as Hex,
        value: '0x0' as Hex,
      },
      options: {
        origin: ORIGIN_METAMASK,
        requireApproval: true,
        type: 'moneyAccountWithdraw' as never,
      },
    });
    mockAddTransaction.mockResolvedValue({} as never);
  });

  it('does not build transaction when vault config is missing', async () => {
    setupSelectors({ vaultConfig: undefined });

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal(BigInt(1_000_000));
    });

    expect(mockBuildWithdraw).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
  });

  it('logs error and returns when provider is unavailable', async () => {
    mockGetProviderByChainId.mockReturnValue(undefined as never);

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal(BigInt(1_000_000));
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('No provider available'),
      }),
    );
    expect(mockBuildWithdraw).not.toHaveBeenCalled();
  });

  it('builds withdraw, navigates, and submits transaction', async () => {
    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal(BigInt(500_000));
    });

    expect(mockBuildWithdraw).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(500_000),
        chainId: MOCK_VAULT_CONFIG.chainId,
        tellerAddress: MOCK_VAULT_CONFIG.tellerAddress,
        accountantAddress: MOCK_VAULT_CONFIG.accountantAddress,
        toAddress: MOCK_MONEY_ACCOUNT.address,
      }),
    );

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.MONEY.ROOT,
    });

    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: MOCK_MONEY_ACCOUNT.address,
        to: '0xteller',
      }),
      expect.objectContaining({
        networkClientId: 'arbitrum-one',
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        requireApproval: true,
      }),
    );
  });

  it('logs error when addTransaction fails', async () => {
    const txError = new Error('withdraw failed');
    mockAddTransaction.mockRejectedValue(txError);

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal(BigInt(500_000));
    });

    expect(Logger.error).toHaveBeenCalledWith(
      txError,
      '[Money Account] Withdrawal transaction failed',
    );
  });
});
