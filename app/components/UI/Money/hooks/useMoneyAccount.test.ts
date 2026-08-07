import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { providerErrors } from '@metamask/rpc-errors';
import { containsUserRejectedError } from '../../../../util/middlewares';
import { useSelector } from 'react-redux';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
} from '../utils/moneyAccountTransactions';
import {
  getMoneyAccountDepositIntent,
  clearMoneyAccountDepositIntent,
  useMoneyAccountDeposit,
  useMoneyAccountWithdrawal,
} from './useMoneyAccount';
import { showDevErrorAlert } from '../utils/devErrorAlert';
import useMoneyToasts from './useMoneyToasts';

jest.mock('react-redux');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../../../../util/middlewares', () => ({
  containsUserRejectedError: jest.fn(),
}));
jest.mock('../../../../util/transaction-controller');
jest.mock('../../../../util/notifications/methods/common');
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('../utils/devErrorAlert', () => ({
  showDevErrorAlert: jest.fn(),
}));
jest.mock('./useMoneyToasts', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      getCurrentRoute: jest.fn(),
    },
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
    ConfirmationLoader: {
      CustomAmount: 'customAmount',
      AdvancedCustomAmount: 'advancedCustomAmount',
    },
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
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockContainsUserRejectedError =
  containsUserRejectedError as jest.MockedFunction<
    typeof containsUserRejectedError
  >;
const mockUseMoneyToasts = useMoneyToasts as jest.MockedFunction<
  typeof useMoneyToasts
>;
const mockGetCurrentRoute = NavigationService.navigation
  .getCurrentRoute as jest.MockedFunction<
  typeof NavigationService.navigation.getCurrentRoute
>;
const mockGetProviderByChainId = getProviderByChainId as jest.MockedFunction<
  typeof getProviderByChainId
>;
const mockAddTransactionBatch = addTransactionBatch as jest.MockedFunction<
  typeof addTransactionBatch
>;
const mockBuildDepositBatch =
  buildMoneyAccountDepositBatch as jest.MockedFunction<
    typeof buildMoneyAccountDepositBatch
  >;
const mockBuildWithdrawBatch =
  buildMoneyAccountWithdrawBatch as jest.MockedFunction<
    typeof buildMoneyAccountWithdrawBatch
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

const MOCK_RECIPIENT = '0xrecipient';

const MOCK_PROVIDER = {} as ReturnType<typeof getProviderByChainId>;
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockDepositFailed = jest.fn();
const mockWithdrawFailed = jest.fn();
const MOCK_DEPOSIT_FAILED_TOAST = { type: 'deposit-failed' };
const MOCK_WITHDRAW_FAILED_TOAST = { type: 'withdraw-failed' };

// 'key' in options is used instead of destructuring defaults so that
// an explicit { vaultConfig: undefined } is treated as "use undefined",
// not "use the default" (JS destructuring defaults apply for undefined values).
interface SelectorOptions {
  vaultConfig?: typeof MOCK_VAULT_CONFIG | undefined;
  primaryMoneyAccount?: typeof MOCK_MONEY_ACCOUNT | undefined;
  recipient?: string | undefined;
}

function setupSelectors(options: SelectorOptions = {}) {
  const vaultConfig =
    'vaultConfig' in options ? options.vaultConfig : MOCK_VAULT_CONFIG;
  const primaryMoneyAccount =
    'primaryMoneyAccount' in options
      ? options.primaryMoneyAccount
      : MOCK_MONEY_ACCOUNT;
  const recipient = 'recipient' in options ? options.recipient : MOCK_RECIPIENT;
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyAccountVaultConfig) return vaultConfig;
    if (selector === selectPrimaryMoneyAccount) return primaryMoneyAccount;
    if (selector === selectEvmAddress) return recipient;
    return undefined;
  });
}

describe('useMoneyAccountDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContainsUserRejectedError.mockReturnValue(false);
    mockUseNavigation.mockReturnValue({ goBack: mockGoBack } as never);
    mockGetCurrentRoute.mockReturnValue({
      name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    } as never);
    mockDepositFailed.mockReturnValue(MOCK_DEPOSIT_FAILED_TOAST);
    mockWithdrawFailed.mockReturnValue(MOCK_WITHDRAW_FAILED_TOAST);
    mockUseMoneyToasts.mockReturnValue({
      showToast: mockShowToast,
      closeToast: jest.fn(),
      MoneyToastOptions: {
        deposit: {
          inProgress: jest.fn(),
          success: jest.fn(),
          failed: mockDepositFailed,
        },
        withdraw: {
          inProgress: jest.fn(),
          success: jest.fn(),
          failed: mockWithdrawFailed,
        },
        send: {
          inProgress: jest.fn(),
          success: jest.fn(),
          failed: jest.fn(),
        },
      },
    });
    global.requestAnimationFrame = jest.fn((callback) => {
      callback(0);
      return 0;
    });
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

  it('throws when vault config is missing', async () => {
    setupSelectors({ vaultConfig: undefined });
    const onDepositSetupFailure = jest.fn();

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await expect(
      act(async () => {
        await result.current.initiateDeposit({ onDepositSetupFailure });
      }),
    ).rejects.toThrow('Missing vault config');

    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
    expect(onDepositSetupFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '[Money Account] Missing vault config',
      }),
    );
  });

  it('throws when provider is unavailable', async () => {
    mockGetProviderByChainId.mockReturnValue(undefined as never);

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await expect(
      act(async () => {
        await result.current.initiateDeposit();
      }),
    ).rejects.toThrow('No provider available');

    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
  });

  it('builds deposit batch, navigates, and submits transaction', async () => {
    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit();
    });

    expect(mockBuildDepositBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(0),
        chainId: MOCK_VAULT_CONFIG.chainId,
        boringVault: MOCK_VAULT_CONFIG.boringVault,
        initialiseWithoutData: true,
      }),
    );

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith({
      loader: ConfirmationLoader.AdvancedCustomAmount,
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
      preferredPaymentToken: undefined,
      autoSelectFiatPayment: undefined,
      replace: undefined,
    });
    expect(
      getNavigateToConfirmation().mock.invocationCallOrder[0],
    ).toBeLessThan(mockBuildDepositBatch.mock.invocationCallOrder[0]);

    expect(mockAddTransactionBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        from: MOCK_MONEY_ACCOUNT.address,
        networkClientId: 'arbitrum-one',
        origin: ORIGIN_METAMASK,
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        skipInitialGasEstimate: true,
      }),
    );
  });

  it('passes autoSelectFiatPayment to navigateToConfirmation', async () => {
    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit({ autoSelectFiatPayment: true });
    });

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith({
      loader: ConfirmationLoader.AdvancedCustomAmount,
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
      preferredPaymentToken: undefined,
      autoSelectFiatPayment: true,
      replace: undefined,
    });
  });

  it('pre-generates a batchId, registers intent before the await, and forwards preferredPaymentToken', async () => {
    const preferredPaymentToken = {
      address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
      chainId: '0x1' as Hex,
    };

    let observedBatchId: string | undefined;
    let intentAtCallTime: ReturnType<typeof getMoneyAccountDepositIntent>;
    mockAddTransactionBatch.mockImplementationOnce(async (args) => {
      observedBatchId = (args as { batchId: string }).batchId;
      intentAtCallTime = getMoneyAccountDepositIntent(observedBatchId);
      return {} as never;
    });

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit({
        preferredPaymentToken,
        intent: 'addMusd',
      });
    });

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith({
      loader: ConfirmationLoader.AdvancedCustomAmount,
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
      preferredPaymentToken,
      autoSelectFiatPayment: undefined,
      replace: undefined,
    });
    expect(observedBatchId).toMatch(/^0x[0-9a-f]+$/);
    expect(intentAtCallTime).toBe('addMusd');
    clearMoneyAccountDepositIntent(observedBatchId);
  });

  it('registers no intent when omitted, leaving it to be derived from the transaction', async () => {
    let observedBatchId: string | undefined;
    mockAddTransactionBatch.mockImplementationOnce(async (args) => {
      observedBatchId = (args as { batchId: string }).batchId;
      return {} as never;
    });

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit();
    });

    expect(getMoneyAccountDepositIntent(observedBatchId)).toBeUndefined();
    clearMoneyAccountDepositIntent(observedBatchId);
  });

  it('clears the registered intent if addTransactionBatch throws', async () => {
    let observedBatchId: string | undefined;
    const txError = new Error('batch submission failed');
    mockAddTransactionBatch.mockImplementationOnce(async (args) => {
      observedBatchId = (args as { batchId: string }).batchId;
      throw txError;
    });

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current
        .initiateDeposit({ intent: 'addMusd' })
        .catch(() => undefined);
    });

    expect(observedBatchId).toBeDefined();
    expect(getMoneyAccountDepositIntent(observedBatchId)).toBeUndefined();
  });

  it('logs and rethrows when addTransactionBatch fails', async () => {
    const txError = new Error('batch submission failed');
    mockAddTransactionBatch.mockRejectedValue(txError);

    const { result } = renderHook(() => useMoneyAccountDeposit());

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.initiateDeposit();
      } catch (error) {
        caught = error as Error;
      }
    });

    expect(caught).toBe(txError);
    expect(Logger.error).toHaveBeenCalledWith(
      txError,
      '[Money Account] Deposit setup failed',
    );
    expect(showDevErrorAlert).toHaveBeenCalledWith(
      '[Money Account] Deposit setup failed',
      txError,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockDepositFailed).toHaveBeenCalledWith({ intent: undefined });
    expect(mockShowToast).toHaveBeenCalledWith(MOCK_DEPOSIT_FAILED_TOAST);
  });

  it('backs out and shows a failure toast when deposit batch building fails', async () => {
    const buildError = new Error('deposit batch build failed');
    const onDepositSetupFailure = jest.fn();
    mockBuildDepositBatch.mockRejectedValue(buildError);

    const { result } = renderHook(() => useMoneyAccountDeposit());

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.initiateDeposit({
          intent: 'convert',
          onDepositSetupFailure,
        });
      } catch (error) {
        caught = error as Error;
      }
    });

    expect(caught).toBe(buildError);
    expect(mockBuildDepositBatch).toHaveBeenCalledTimes(1);
    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockDepositFailed).toHaveBeenCalledWith({ intent: 'convert' });
    expect(mockShowToast).toHaveBeenCalledWith(MOCK_DEPOSIT_FAILED_TOAST);
    expect(onDepositSetupFailure).not.toHaveBeenCalled();
  });

  it('does not navigate back when deposit confirmation is rejected', async () => {
    const rejectionError = providerErrors.userRejectedRequest();
    mockContainsUserRejectedError.mockReturnValueOnce(true);
    mockAddTransactionBatch.mockRejectedValue(rejectionError);

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await expect(
      act(async () => {
        await result.current.initiateDeposit();
      }),
    ).rejects.toBe(rejectionError);

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockDepositFailed).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('forwards replaceConfirmation to confirmation navigation', async () => {
    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit({ replaceConfirmation: true });
    });

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith(
      expect.objectContaining({
        replace: true,
      }),
    );
  });

  it('always sets skipInitialGasEstimate to true regardless of chain', async () => {
    setupSelectors({
      vaultConfig: { ...MOCK_VAULT_CONFIG, chainId: '0x8f' },
    });

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await act(async () => {
      await result.current.initiateDeposit();
    });

    expect(mockAddTransactionBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        isGasFeeSponsored: true,
        skipInitialGasEstimate: true,
      }),
    );
  });

  it('throws when networkClientId cannot be resolved', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue(
      undefined as unknown as string,
    );

    const { result } = renderHook(() => useMoneyAccountDeposit());

    await expect(
      act(async () => {
        await result.current.initiateDeposit();
      }),
    ).rejects.toThrow('Network client not found');

    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
  });
});

describe('useMoneyAccountWithdrawal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContainsUserRejectedError.mockReturnValue(false);
    mockUseNavigation.mockReturnValue({ goBack: mockGoBack } as never);
    mockGetCurrentRoute.mockReturnValue({
      name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    } as never);
    mockDepositFailed.mockReturnValue(MOCK_DEPOSIT_FAILED_TOAST);
    mockWithdrawFailed.mockReturnValue(MOCK_WITHDRAW_FAILED_TOAST);
    mockUseMoneyToasts.mockReturnValue({
      showToast: mockShowToast,
      closeToast: jest.fn(),
      MoneyToastOptions: {
        deposit: {
          inProgress: jest.fn(),
          success: jest.fn(),
          failed: mockDepositFailed,
        },
        withdraw: {
          inProgress: jest.fn(),
          success: jest.fn(),
          failed: mockWithdrawFailed,
        },
        send: {
          inProgress: jest.fn(),
          success: jest.fn(),
          failed: jest.fn(),
        },
      },
    });
    global.requestAnimationFrame = jest.fn((callback) => {
      callback(0);
      return 0;
    });
    setupSelectors();
    mockGetProviderByChainId.mockReturnValue(MOCK_PROVIDER);
    mockFindNetworkClientIdByChainId.mockReturnValue('arbitrum-one');
    mockBuildWithdrawBatch.mockResolvedValue({
      withdrawTx: {
        params: {
          to: '0xteller' as Hex,
          data: '0xwithdraw' as Hex,
          value: '0x0' as Hex,
        },
        type: 'moneyAccountWithdraw' as never,
      },
      transferTx: {
        params: {
          to: '0xusdc' as Hex,
          data: '0xtransfer' as Hex,
          value: '0x0' as Hex,
        },
        type: 'tokenMethodTransfer' as never,
      },
    });
    mockAddTransactionBatch.mockResolvedValue({} as never);
  });

  it('throws when vault config is missing', async () => {
    setupSelectors({ vaultConfig: undefined });

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await expect(
      act(async () => {
        await result.current.initiateWithdrawal();
      }),
    ).rejects.toThrow('Missing vault config');

    expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
  });

  it('throws when recipient EVM address is missing', async () => {
    setupSelectors({ recipient: undefined });

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await expect(
      act(async () => {
        await result.current.initiateWithdrawal();
      }),
    ).rejects.toThrow('Missing recipient EVM address');

    expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
  });

  it('throws when provider is unavailable', async () => {
    mockGetProviderByChainId.mockReturnValue(undefined as never);

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await expect(
      act(async () => {
        await result.current.initiateWithdrawal();
      }),
    ).rejects.toThrow('No provider available');

    expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
  });

  it('builds withdraw batch, navigates, and submits transaction batch', async () => {
    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal();
    });

    // Hook calls the builder with a placeholder amount of 0n; MM Pay rewrites
    // the calldata via `updateMoneyAccountWithdrawTokenAmount` once the user
    // picks an amount on the confirmation screen.
    expect(mockBuildWithdrawBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(0),
        chainId: MOCK_VAULT_CONFIG.chainId,
        tellerAddress: MOCK_VAULT_CONFIG.tellerAddress,
        accountantAddress: MOCK_VAULT_CONFIG.accountantAddress,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT.address,
        recipient: MOCK_RECIPIENT,
      }),
    );

    expect(getNavigateToConfirmation()).toHaveBeenCalledWith({
      loader: ConfirmationLoader.AdvancedCustomAmount,
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
    });
    expect(
      getNavigateToConfirmation().mock.invocationCallOrder[0],
    ).toBeLessThan(mockBuildWithdrawBatch.mock.invocationCallOrder[0]);

    expect(mockAddTransactionBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        from: MOCK_MONEY_ACCOUNT.address,
        networkClientId: 'arbitrum-one',
        origin: ORIGIN_METAMASK,
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        transactions: [
          expect.objectContaining({ type: 'moneyAccountWithdraw' }),
          expect.objectContaining({ type: 'tokenMethodTransfer' }),
        ],
      }),
    );
  });

  it('sets isGasFeeSponsored to true when vault chain is Monad', async () => {
    setupSelectors({
      vaultConfig: { ...MOCK_VAULT_CONFIG, chainId: '0x8f' },
    });

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal();
    });

    expect(mockAddTransactionBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        isGasFeeSponsored: true,
        skipInitialGasEstimate: true,
      }),
    );
  });

  it('sets isGasFeeSponsored to false but skipInitialGasEstimate to true when vault chain is not Monad', async () => {
    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await act(async () => {
      await result.current.initiateWithdrawal();
    });

    expect(mockAddTransactionBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        isGasFeeSponsored: false,
        skipInitialGasEstimate: true,
      }),
    );
  });

  it('logs and rethrows when addTransactionBatch fails', async () => {
    const txError = new Error('batch failed');
    mockAddTransactionBatch.mockRejectedValue(txError);

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.initiateWithdrawal();
      } catch (error) {
        caught = error as Error;
      }
    });

    expect(caught).toBe(txError);
    expect(Logger.error).toHaveBeenCalledWith(
      txError,
      '[Money Account] Withdrawal transaction failed',
    );
    expect(showDevErrorAlert).toHaveBeenCalledWith(
      '[Money Account] Withdrawal transaction failed',
      txError,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockWithdrawFailed).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(MOCK_WITHDRAW_FAILED_TOAST);
  });

  it('backs out and shows a failure toast when withdrawal batch building fails', async () => {
    const buildError = new Error('withdrawal batch build failed');
    mockBuildWithdrawBatch.mockRejectedValue(buildError);

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.initiateWithdrawal();
      } catch (error) {
        caught = error as Error;
      }
    });

    expect(caught).toBe(buildError);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockWithdrawFailed).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(MOCK_WITHDRAW_FAILED_TOAST);
  });

  it('does not navigate back when withdrawal confirmation is rejected', async () => {
    const rejectionError = providerErrors.userRejectedRequest();
    mockContainsUserRejectedError.mockReturnValueOnce(true);
    mockAddTransactionBatch.mockRejectedValue(rejectionError);

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await expect(
      act(async () => {
        await result.current.initiateWithdrawal();
      }),
    ).rejects.toBe(rejectionError);

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockWithdrawFailed).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('throws when networkClientId cannot be resolved', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue(
      undefined as unknown as string,
    );

    const { result } = renderHook(() => useMoneyAccountWithdrawal());

    await expect(
      act(async () => {
        await result.current.initiateWithdrawal();
      }),
    ).rejects.toThrow('Network client not found');

    expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    expect(getNavigateToConfirmation()).not.toHaveBeenCalled();
  });
});
