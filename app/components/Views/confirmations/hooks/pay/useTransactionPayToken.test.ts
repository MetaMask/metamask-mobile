import { ChainId } from '@metamask/controller-utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  useSetNonEvmPayToken,
  useTransactionPayToken,
} from './useTransactionPayToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import {
  EvmPaymentToken,
  NonEvmPaymentToken,
  PaymentOverride,
  TransactionConfig,
  TransactionPayRequiredToken,
} from '@metamask/transaction-pay-controller';
import Engine from '../../../../../core/Engine';
import { flushPromises } from '../../../../../util/test/utils';
import { updateTransaction } from '../../../../../util/transaction-controller';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
      updatePaymentToken: jest.fn(),
    },
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  updateTransaction: jest.fn(),
}));

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const TRANSACTION_ID_MOCK =
  STATE_MOCK.engine.backgroundState.TransactionController.transactions[0].id;

const NETWORK_CLIENT_ID_MOCK = 'network-client-id-mock';

const PAY_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  balanceHuman: '123.456',
  balanceFiat: '456.12',
  balanceUsd: '456.123',
  balanceRaw: '123456000000000000000',
  chainId: ChainId.mainnet,
  decimals: 4,
  symbol: 'TST',
} as EvmPaymentToken;

const REQUIRED_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  chainId: ChainId.mainnet,
  skipIfBalance: false,
} as unknown as TransactionPayRequiredToken;

const NON_EVM_PAY_TOKEN_MOCK = {
  accountId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:SoLAddress',
  assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  balanceFiat: '300',
  balanceHuman: '2',
  balanceRaw: '2000000000',
  balanceUsd: '300',
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  decimals: 9,
  symbol: 'SOL',
  walletAccountId: 'solana-account-id',
} as NonEvmPaymentToken;

function runHook({
  payToken,
  type,
  requiredTokens,
}: {
  payToken?: EvmPaymentToken | NonEvmPaymentToken;
  type?: TransactionType;
  requiredTokens?: TransactionPayRequiredToken[];
} = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  mockState.engine.backgroundState.TransactionPayController = {
    transactionData: {
      [TRANSACTION_ID_MOCK]: {
        isLoading: false,
        paymentToken: payToken,
        tokens: requiredTokens ?? [],
      },
    },
  };

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  return renderHookWithProvider(useTransactionPayToken, {
    state: mockState,
  });
}

describe('useTransactionPayToken', () => {
  const updatePaymentTokenMock = jest.mocked(
    Engine.context.TransactionPayController.updatePaymentToken,
  );

  const findNetworkClientIdByChainIdMock = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  const fetchGasFeeEstimatesMock = jest.mocked(
    Engine.context.GasFeeController.fetchGasFeeEstimates,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    findNetworkClientIdByChainIdMock.mockReturnValue(NETWORK_CLIENT_ID_MOCK);
    fetchGasFeeEstimatesMock.mockResolvedValue({} as never);
  });

  it('returns undefined if no state', () => {
    const { result } = runHook();

    expect(result.current.payToken).toBeUndefined();
    expect(result.current.isNative).toBeFalsy();
  });

  it('returns token matching state', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.payToken).toStrictEqual(PAY_TOKEN_MOCK);
    expect(result.current.isNative).toBe(false);
  });

  it('sets token in state', async () => {
    const { result } = runHook();

    result.current.setPayToken({
      address: PAY_TOKEN_MOCK.address,
      chainId: PAY_TOKEN_MOCK.chainId as ChainId,
    });

    await flushPromises();

    expect(updatePaymentTokenMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      tokenAddress: PAY_TOKEN_MOCK.address,
      chainId: PAY_TOKEN_MOCK.chainId,
    });
  });

  it('returns isNative true when pay token is native address', () => {
    const { result } = runHook({
      payToken: {
        ...PAY_TOKEN_MOCK,
        address: '0x0000000000000000000000000000000000000000',
      } as EvmPaymentToken,
    });

    expect(result.current.isNative).toBe(true);
  });

  describe('selectedGasFeeToken update for predictDeposit', () => {
    const updateTransactionMock = jest.mocked(updateTransaction);

    beforeEach(() => {
      updateTransactionMock.mockClear();
    });

    it('updates transaction with selectedGasFeeToken for predictDeposit when pay token matches required token', async () => {
      const { result } = runHook({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.predictDeposit,
        requiredTokens: [REQUIRED_TOKEN_MOCK],
      });

      result.current.setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedGasFeeToken: PAY_TOKEN_MOCK.address,
          isGasFeeTokenIgnoredIfBalance: true,
        }),
        TRANSACTION_ID_MOCK,
      );
    });

    it('updates transaction with selectedGasFeeToken for predictDepositAndOrder when pay token matches required token', async () => {
      const { result } = runHook({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.predictDepositAndOrder,
        requiredTokens: [REQUIRED_TOKEN_MOCK],
      });

      result.current.setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedGasFeeToken: PAY_TOKEN_MOCK.address,
          isGasFeeTokenIgnoredIfBalance: true,
        }),
        TRANSACTION_ID_MOCK,
      );
    });

    it('resets selectedGasFeeToken for predictDepositAndOrder when pay token does not match required token', async () => {
      const differentToken = {
        address: '0xDifferentTokenAddress1234567890123456789012',
        chainId: ChainId.mainnet,
        skipIfBalance: false,
      } as unknown as TransactionPayRequiredToken;

      const { result } = runHook({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.predictDepositAndOrder,
        requiredTokens: [differentToken],
      });

      result.current.setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedGasFeeToken: undefined,
          isGasFeeTokenIgnoredIfBalance: undefined,
        }),
        TRANSACTION_ID_MOCK,
      );
    });

    it('does not update transaction for non-predictDeposit transaction types', async () => {
      const { result } = runHook({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.simpleSend,
        requiredTokens: [REQUIRED_TOKEN_MOCK],
      });

      result.current.setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      await flushPromises();

      expect(updateTransactionMock).not.toHaveBeenCalled();
    });

    it('resets selectedGasFeeToken when pay token does not match required token', async () => {
      const differentToken = {
        address: '0xDifferentTokenAddress1234567890123456789012',
        chainId: ChainId.mainnet,
        skipIfBalance: false,
      } as unknown as TransactionPayRequiredToken;

      const { result } = runHook({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.predictDeposit,
        requiredTokens: [differentToken],
      });

      result.current.setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedGasFeeToken: undefined,
          isGasFeeTokenIgnoredIfBalance: undefined,
        }),
        TRANSACTION_ID_MOCK,
      );
    });

    it('resets selectedGasFeeToken when no required tokens exist', async () => {
      const { result } = runHook({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.predictDeposit,
        requiredTokens: [],
      });

      result.current.setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedGasFeeToken: undefined,
          isGasFeeTokenIgnoredIfBalance: undefined,
        }),
        TRANSACTION_ID_MOCK,
      );
    });
  });

  it('exposes a non-EVM payment token separately from the EVM pay token', () => {
    const { result } = runHook({ payToken: NON_EVM_PAY_TOKEN_MOCK });

    expect(result.current.nonEvmPayToken).toStrictEqual(NON_EVM_PAY_TOKEN_MOCK);
    expect(result.current.payToken).toBeUndefined();
    expect(result.current.isNative).toBeFalsy();
  });

  describe('Money Account deposit funded by a non-EVM token', () => {
    const setTransactionConfigMock = jest.mocked(
      Engine.context.TransactionPayController.setTransactionConfig,
    );

    function getAppliedConfig(initialConfig: TransactionConfig = {}) {
      const config = { ...initialConfig };
      const callback = setTransactionConfigMock.mock.calls[0][1];
      callback(config);
      return config;
    }

    function renderSetPayTokenHooks({
      payToken,
      type,
    }: {
      payToken?: EvmPaymentToken | NonEvmPaymentToken;
      type: TransactionType;
    }) {
      const mockState = cloneDeep(STATE_MOCK);
      mockState.engine.backgroundState.TransactionPayController = {
        transactionData: {
          [TRANSACTION_ID_MOCK]: {
            isLoading: false,
            paymentToken: payToken,
            tokens: [],
          },
        },
      };
      mockState.engine.backgroundState.TransactionController.transactions[0].type =
        type;

      return renderHookWithProvider(
        () => ({
          setNonEvmPayToken: useSetNonEvmPayToken(),
          setPayToken: useTransactionPayToken().setPayToken,
        }),
        { state: mockState },
      ).result.current;
    }

    it('sets the non-atomic Money Account config before selecting the token', () => {
      const { setNonEvmPayToken } = renderSetPayTokenHooks({
        type: TransactionType.moneyAccountDeposit,
      });

      setNonEvmPayToken({
        assetId: NON_EVM_PAY_TOKEN_MOCK.assetId,
        walletAccountId: NON_EVM_PAY_TOKEN_MOCK.walletAccountId,
      });

      expect(setTransactionConfigMock).toHaveBeenCalledWith(
        TRANSACTION_ID_MOCK,
        expect.any(Function),
      );
      expect(getAppliedConfig()).toStrictEqual({
        atomic: false,
        paymentOverride: PaymentOverride.MoneyAccount,
      });
      expect(setTransactionConfigMock.mock.invocationCallOrder[0]).toBeLessThan(
        updatePaymentTokenMock.mock.invocationCallOrder[0],
      );
    });

    it('does not change the config for other transaction types', () => {
      const { setNonEvmPayToken } = renderSetPayTokenHooks({
        type: TransactionType.perpsDeposit,
      });

      setNonEvmPayToken({
        assetId: NON_EVM_PAY_TOKEN_MOCK.assetId,
        walletAccountId: NON_EVM_PAY_TOKEN_MOCK.walletAccountId,
      });

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('clears the Money Account config when switching back to an EVM token', () => {
      const { setPayToken } = renderSetPayTokenHooks({
        payToken: NON_EVM_PAY_TOKEN_MOCK,
        type: TransactionType.moneyAccountDeposit,
      });

      setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      expect(
        getAppliedConfig({
          atomic: false,
          paymentOverride: PaymentOverride.MoneyAccount,
        }),
      ).toStrictEqual({
        atomic: undefined,
        paymentOverride: undefined,
      });
    });

    it('keeps the atomic hint of an armed Max when switching back to an EVM token', () => {
      const { setPayToken } = renderSetPayTokenHooks({
        payToken: NON_EVM_PAY_TOKEN_MOCK,
        type: TransactionType.moneyAccountDeposit,
      });

      setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      expect(
        getAppliedConfig({
          atomic: false,
          isMaxAmount: true,
          paymentOverride: PaymentOverride.MoneyAccount,
        }),
      ).toStrictEqual({
        atomic: false,
        isMaxAmount: true,
        paymentOverride: undefined,
      });
    });

    it('does not change the config when switching between EVM tokens', () => {
      const { setPayToken } = renderSetPayTokenHooks({
        payToken: PAY_TOKEN_MOCK,
        type: TransactionType.moneyAccountDeposit,
      });

      setPayToken({
        address: PAY_TOKEN_MOCK.address,
        chainId: PAY_TOKEN_MOCK.chainId as ChainId,
      });

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });
  });

  it('selects a non-EVM payment token by CAIP asset ID and wallet account', () => {
    const mockState = cloneDeep(STATE_MOCK);
    const { result } = renderHookWithProvider(useSetNonEvmPayToken, {
      state: mockState,
    });

    result.current({
      assetId: NON_EVM_PAY_TOKEN_MOCK.assetId,
      walletAccountId: NON_EVM_PAY_TOKEN_MOCK.walletAccountId,
    });

    expect(updatePaymentTokenMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      assetId: NON_EVM_PAY_TOKEN_MOCK.assetId,
      walletAccountId: NON_EVM_PAY_TOKEN_MOCK.walletAccountId,
    });
  });
});
