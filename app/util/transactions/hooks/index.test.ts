import { Hex } from '@metamask/utils';
import { TransactionPayPublishHook } from '@metamask/transaction-pay-controller';
import {
  type PublishBatchHookTransaction,
  type PublishHook,
  type TransactionController,
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import {
  getSmartTransactionsFeatureFlagsForChain,
  selectShouldUseSmartTransaction,
} from '../../../selectors/smartTransactionsController';
import {
  selectMetaMaskPayFlags,
  selectPayQuoteConfig,
} from '../../../selectors/featureFlagController/confirmations';
import { updateConfirmationMetric } from '../../../core/redux/slices/confirmationMetrics';
import { store } from '../../../store';
import {
  submitBatchSmartTransactionHook,
  submitSmartTransactionHook,
} from '../../smart-transactions/smart-publish-hook';
import { accountSupports7702 } from '../account-supports-7702';
import { getTransactionById } from '..';
import { isSendBundleSupported } from '../sentinel-api';
import { Delegation7702PublishHook } from './delegation-7702-publish';
import {
  getTransactionControllerHooks,
  type TransactionControllerHookRequest,
} from '.';

jest.mock('@metamask/transaction-pay-controller');
jest.mock('../../../selectors/smartTransactionsController');
jest.mock('../../../selectors/featureFlagController/confirmations');
jest.mock('../../../core/redux/slices/confirmationMetrics', () => ({
  updateConfirmationMetric: jest.fn((params) => ({
    payload: params,
    type: 'updateConfirmationMetric',
  })),
}));
jest.mock('../../../store', () => ({
  store: { dispatch: jest.fn() },
}));
jest.mock('../../smart-transactions/smart-publish-hook');
jest.mock('../account-supports-7702');
jest.mock('..');
jest.mock('../sentinel-api');
jest.mock('./delegation-7702-publish');

const MOCK_TRANSACTION_META = {
  chainId: '0x1',
  id: '123',
  networkClientId: 'selectedNetworkClientId',
  status: TransactionStatus.approved,
  time: 123,
  txParams: {
    from: '0x123',
  },
} as TransactionMeta;

const FEATURE_FLAGS = {
  batchStatusPollingInterval: 1000,
  mobileReturnTxHashAsap: false,
} as never;

function buildRequest(
  overrides: Partial<TransactionControllerHookRequest> = {},
): TransactionControllerHookRequest {
  const initMessenger = {
    call: jest.fn((action: string) => {
      if (action === 'PredictController:beforePublish') {
        return true;
      }

      if (action === 'PredictController:beforeSign') {
        return {};
      }

      if (action === 'PredictController:publish') {
        return { transactionHash: undefined };
      }

      if (action === 'TransactionController:getState') {
        return { transactions: [MOCK_TRANSACTION_META] };
      }

      return undefined;
    }),
  } as unknown as TransactionControllerHookRequest['initMessenger'];

  const transactionController = {
    getNonceLock: jest.fn().mockResolvedValue({
      nextNonce: 1,
      releaseLock: jest.fn(),
    }),
    isAtomicBatchSupported: jest.fn().mockResolvedValue([]),
    state: { transactions: [MOCK_TRANSACTION_META] },
  } as unknown as TransactionController;

  return {
    getState: jest.fn().mockReturnValue({}),
    getTransactionController: () => transactionController,
    initMessenger,
    ...overrides,
  };
}

describe('getTransactionControllerHooks', () => {
  const payHookMock: jest.MockedFn<PublishHook> = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(TransactionPayPublishHook).mockReturnValue({
      getHook: () => payHookMock,
    } as unknown as TransactionPayPublishHook);

    payHookMock.mockResolvedValue({ transactionHash: undefined });
    jest.mocked(selectShouldUseSmartTransaction).mockReturnValue(true);
    jest
      .mocked(getSmartTransactionsFeatureFlagsForChain)
      .mockReturnValue(FEATURE_FLAGS);
    jest.mocked(selectMetaMaskPayFlags).mockReturnValue({
      attemptsMax: 2,
      bufferInitial: 0.025,
      bufferStep: 0.025,
      bufferSubsequent: 0.05,
      enableDepositWalletWithdraw: false,
      enableMoneyAccountTransactions: {},
      prefilledAmount: { default: { enabled: false }, overrides: {} },
      slippage: 0.005,
      stxDisabled: false,
    });
    jest.mocked(accountSupports7702).mockResolvedValue(false);
    jest.mocked(isSendBundleSupported).mockResolvedValue(true);
    jest.mocked(getTransactionById).mockReturnValue(MOCK_TRANSACTION_META);
    jest
      .mocked(selectPayQuoteConfig)
      .mockReturnValue({ enabled: false, tokens: [] } as never);
  });

  it('returns the TransactionController hook functions', () => {
    const hooks = getTransactionControllerHooks(buildRequest());

    expect(hooks).toStrictEqual(
      expect.objectContaining({
        beforePublish: expect.any(Function),
        beforeSign: expect.any(Function),
        publish: expect.any(Function),
        publishBatch: expect.any(Function),
      }),
    );
  });

  it('delegates Predict beforePublish and beforeSign through the init messenger', async () => {
    const request = buildRequest();
    const hooks = getTransactionControllerHooks(request);

    await hooks.beforePublish?.(MOCK_TRANSACTION_META);
    await hooks.beforeSign?.({ transactionMeta: MOCK_TRANSACTION_META });

    expect(request.initMessenger.call).toHaveBeenCalledWith(
      'PredictController:beforePublish',
      { transactionMeta: MOCK_TRANSACTION_META },
    );
    expect(request.initMessenger.call).toHaveBeenCalledWith(
      'PredictController:beforeSign',
      { transactionMeta: MOCK_TRANSACTION_META },
    );
  });

  it('short-circuits publish when Predict returns a transaction hash', async () => {
    const request = buildRequest({
      initMessenger: {
        call: jest.fn((action: string) => {
          if (action === 'PredictController:publish') {
            return { transactionHash: '0xpredict' };
          }

          return undefined;
        }),
      } as unknown as TransactionControllerHookRequest['initMessenger'],
    });
    const hooks = getTransactionControllerHooks(request);

    const result = await hooks.publish?.(MOCK_TRANSACTION_META);

    expect(result).toStrictEqual({ transactionHash: '0xpredict' });
    expect(payHookMock).not.toHaveBeenCalled();
    expect(submitSmartTransactionHook).not.toHaveBeenCalled();
  });

  it('short-circuits publish when TransactionPay returns a transaction hash', async () => {
    payHookMock.mockResolvedValue({ transactionHash: '0xpay' });

    const hooks = getTransactionControllerHooks(buildRequest());
    const result = await hooks.publish?.(MOCK_TRANSACTION_META);

    expect(result).toStrictEqual({ transactionHash: '0xpay' });
    expect(submitSmartTransactionHook).not.toHaveBeenCalled();
  });

  it('records sentinel_stx metrics when smart transaction hook publishes', async () => {
    jest.mocked(submitSmartTransactionHook).mockResolvedValue({
      transactionHash: '0xstx',
    });

    const hooks = getTransactionControllerHooks(buildRequest());
    const result = await hooks.publish?.(MOCK_TRANSACTION_META);

    expect(result).toStrictEqual({ transactionHash: '0xstx' });
    expect(updateConfirmationMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MOCK_TRANSACTION_META.id,
        params: expect.objectContaining({
          properties: expect.objectContaining({
            transaction_submission_method: 'sentinel_stx',
          }),
        }),
      }),
    );
  });

  it('returns undefined hash when no hook publishes the transaction', async () => {
    jest.mocked(accountSupports7702).mockResolvedValue(false);
    jest.mocked(submitSmartTransactionHook).mockResolvedValue({
      transactionHash: undefined,
    });

    const hooks = getTransactionControllerHooks(buildRequest());
    const result = await hooks.publish?.(MOCK_TRANSACTION_META);

    expect(result).toStrictEqual({ transactionHash: undefined });
  });

  it('records sentinel_relay metrics when the delegation hook publishes', async () => {
    jest.mocked(accountSupports7702).mockResolvedValue(true);
    jest.mocked(selectShouldUseSmartTransaction).mockReturnValue(false);
    jest.mocked(isSendBundleSupported).mockResolvedValue(false);

    const delegationHookMock: jest.MockedFn<PublishHook> = jest
      .fn()
      .mockResolvedValue({ transactionHash: '0xde702' });
    jest.mocked(Delegation7702PublishHook).mockImplementation(
      () =>
        ({
          getHook: () => delegationHookMock,
        }) as unknown as InstanceType<typeof Delegation7702PublishHook>,
    );

    const hooks = getTransactionControllerHooks(buildRequest());
    const result = await hooks.publish?.(MOCK_TRANSACTION_META);

    expect(result).toStrictEqual({ transactionHash: '0xde702' });
    expect(updateConfirmationMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MOCK_TRANSACTION_META.id,
        params: expect.objectContaining({
          properties: expect.objectContaining({
            transaction_submission_method: 'sentinel_relay',
          }),
        }),
      }),
    );
  });

  it('records sentinel_stx metrics when the batch hook publishes', async () => {
    const transactions = [
      { id: 'tx1', signedTx: '0xaaa' as Hex },
      { id: 'tx2', signedTx: '0xbbb' as Hex },
    ] as PublishBatchHookTransaction[];
    jest.mocked(submitBatchSmartTransactionHook).mockResolvedValue({
      results: [{ transactionHash: '0xhash1' }, { transactionHash: '0xhash2' }],
    });

    const hooks = getTransactionControllerHooks(buildRequest());
    await hooks.publishBatch?.({
      from: '0x123',
      networkClientId: 'selectedNetworkClientId',
      transactions,
    });

    expect(store.dispatch).toHaveBeenCalledTimes(2);
    expect(updateConfirmationMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx1',
        params: expect.objectContaining({
          properties: expect.objectContaining({
            transaction_submission_method: 'sentinel_stx',
          }),
        }),
      }),
    );
  });

  it('returns undefined from publishBatch when smart transactions are disabled', async () => {
    jest.mocked(selectShouldUseSmartTransaction).mockReturnValue(false);

    const hooks = getTransactionControllerHooks(buildRequest());
    const result = await hooks.publishBatch?.({
      from: '0x123',
      networkClientId: 'selectedNetworkClientId',
      transactions: [
        { id: 'tx1', signedTx: '0xaaa' as Hex },
      ] as PublishBatchHookTransaction[],
    });

    expect(result).toBeUndefined();
    expect(submitBatchSmartTransactionHook).not.toHaveBeenCalled();
  });

  it('throws from publishBatch when the transaction is not found', async () => {
    jest.mocked(getTransactionById).mockReturnValue(undefined as never);

    const hooks = getTransactionControllerHooks(buildRequest());

    await expect(
      hooks.publishBatch?.({
        from: '0x123',
        networkClientId: 'selectedNetworkClientId',
        transactions: [
          { id: 'missing-tx', signedTx: '0xaaa' as Hex },
        ] as PublishBatchHookTransaction[],
      }),
    ).rejects.toThrow('Could not find transaction with id missing-tx');
  });

  function buildPayStateRequest(
    payData: Record<string, unknown> | undefined,
  ): TransactionControllerHookRequest {
    return buildRequest({
      initMessenger: {
        call: jest.fn((action: string) => {
          if (action === 'PredictController:publish') {
            return { transactionHash: undefined };
          }

          if (action === 'TransactionPayController:getState') {
            return {
              transactionData: payData ? { '123': payData } : {},
            };
          }

          return undefined;
        }),
      } as unknown as TransactionControllerHookRequest['initMessenger'],
    });
  }

  describe('quote-required transaction types', () => {
    it('throws when moneyAccountDeposit has no quotes', async () => {
      const request = buildRequest({
        initMessenger: {
          call: jest.fn((action: string) => {
            if (action === 'PredictController:publish') {
              return { transactionHash: undefined };
            }

            if (action === 'TransactionPayController:getState') {
              return {
                transactionData: {
                  '123': {
                    quotes: [],
                  },
                },
              };
            }

            return undefined;
          }),
        } as unknown as TransactionControllerHookRequest['initMessenger'],
      });

      const hooks = getTransactionControllerHooks(request);
      const moneyAccountTx = {
        ...MOCK_TRANSACTION_META,
        type: TransactionType.moneyAccountDeposit,
      };

      await expect(hooks.publish?.(moneyAccountTx)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('does not throw for moneyAccountDeposit when quotes are present', async () => {
      payHookMock.mockResolvedValue({
        transactionHash: '0xpay-with-quote',
      });

      const hooks = getTransactionControllerHooks(buildRequest());
      const moneyAccountTx = {
        ...MOCK_TRANSACTION_META,
        type: TransactionType.moneyAccountDeposit,
      };

      const result = await hooks.publish?.(moneyAccountTx);

      expect(result).toStrictEqual({
        transactionHash: '0xpay-with-quote',
      });
    });

    it('does not throw when non-quote-required transaction has no quotes', async () => {
      jest.mocked(accountSupports7702).mockResolvedValue(false);
      jest.mocked(submitSmartTransactionHook).mockResolvedValue({
        transactionHash: undefined,
      });

      const hooks = getTransactionControllerHooks(buildRequest());
      const simpleSendTx = {
        ...MOCK_TRANSACTION_META,
        type: TransactionType.simpleSend,
      };

      const result = await hooks.publish?.(simpleSendTx);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });

    it('throws when moneyAccountDeposit only has a no-op quote', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({ quotes: [{ strategy: 'none' }] }),
      );
      const moneyAccountTx = {
        ...MOCK_TRANSACTION_META,
        type: TransactionType.moneyAccountDeposit,
      };

      await expect(hooks.publish?.(moneyAccountTx)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('does not throw for moneyAccountDeposit when an executable quote is in state', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({ quotes: [{ strategy: 'relay' }] }),
      );
      const moneyAccountTx = {
        ...MOCK_TRANSACTION_META,
        type: TransactionType.moneyAccountDeposit,
      };

      const result = await hooks.publish?.(moneyAccountTx);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });
  });

  describe('pay-token-required transaction types', () => {
    const REQUIRED_TOKEN = {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      chainId: '0xa4b1',
      skipIfBalance: false,
    };

    const GAS_TOKEN = {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0xa4b1',
      skipIfBalance: true,
    };

    const PERPS_DEPOSIT_TX = {
      ...MOCK_TRANSACTION_META,
      type: TransactionType.perpsDeposit,
    };

    it('throws for perps deposit when no pay state exists', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest(undefined),
      );

      await expect(hooks.publish?.(PERPS_DEPOSIT_TX)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('throws for perps deposit without quotes when paying with a different token', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          paymentToken: { address: '0x123', chainId: '0x1' },
          quotes: [],
          sourceAmounts: [],
          tokens: [REQUIRED_TOKEN],
        }),
      );

      await expect(hooks.publish?.(PERPS_DEPOSIT_TX)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('throws for perps deposit without quotes when a required conversion is pending', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          paymentToken: REQUIRED_TOKEN,
          quotes: [],
          sourceAmounts: [{ targetTokenAddress: REQUIRED_TOKEN.address }],
          tokens: [REQUIRED_TOKEN],
        }),
      );

      await expect(hooks.publish?.(PERPS_DEPOSIT_TX)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('does not throw for perps deposit paying with the required token when only optional conversions are pending', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          paymentToken: REQUIRED_TOKEN,
          quotes: [],
          sourceAmounts: [{ targetTokenAddress: GAS_TOKEN.address }],
          tokens: [REQUIRED_TOKEN, GAS_TOKEN],
        }),
      );

      const result = await hooks.publish?.(PERPS_DEPOSIT_TX);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });

    it('does not throw for perps deposit with only a no-op quote on a validated direct route', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          paymentToken: {
            ...REQUIRED_TOKEN,
            address: REQUIRED_TOKEN.address.toLowerCase(),
          },
          quotes: [{ strategy: 'none' }],
          sourceAmounts: [],
          tokens: [REQUIRED_TOKEN],
        }),
      );

      const result = await hooks.publish?.(PERPS_DEPOSIT_TX);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });
  });

  describe('post-quote withdraw types', () => {
    const PREDICT_WITHDRAW_TX = {
      ...MOCK_TRANSACTION_META,
      type: TransactionType.predictWithdraw,
    };

    const PAYMENT_TOKEN = {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
    };

    beforeEach(() => {
      jest
        .mocked(selectPayQuoteConfig)
        .mockReturnValue({ enabled: true, tokens: [] } as never);
    });

    it('does not validate when the post-quote flag is disabled', async () => {
      jest
        .mocked(selectPayQuoteConfig)
        .mockReturnValue({ enabled: false, tokens: [] } as never);

      const hooks = getTransactionControllerHooks(
        buildPayStateRequest(undefined),
      );

      const result = await hooks.publish?.(PREDICT_WITHDRAW_TX);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });

    it('throws for predict withdraw when pay state is missing', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest(undefined),
      );

      await expect(hooks.publish?.(PREDICT_WITHDRAW_TX)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('throws for predict withdraw without quotes when a conversion is pending', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          isPostQuote: true,
          paymentToken: PAYMENT_TOKEN,
          quotes: [],
          sourceAmounts: [{ targetTokenAddress: PAYMENT_TOKEN.address }],
        }),
      );

      await expect(hooks.publish?.(PREDICT_WITHDRAW_TX)).rejects.toThrow(
        'MetaMask Pay: Cannot submit without quote',
      );
    });

    it('does not throw for predict withdraw on a validated direct route', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          isPostQuote: true,
          paymentToken: PAYMENT_TOKEN,
          quotes: [],
          sourceAmounts: [],
        }),
      );

      const result = await hooks.publish?.(PREDICT_WITHDRAW_TX);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });

    it('does not throw for predict withdraw with no preferred or last-used token and no pending conversion', async () => {
      // Withdraws with no preferred or last-used token intentionally leave
      // paymentToken unset and default to a direct, same-token transfer
      // (see getBestToken in useAutomaticTransactionPayToken).
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          isPostQuote: true,
          paymentToken: undefined,
          quotes: [],
          sourceAmounts: [],
        }),
      );

      const result = await hooks.publish?.(PREDICT_WITHDRAW_TX);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });

    it('does not throw for predict withdraw when an executable quote is in state', async () => {
      const hooks = getTransactionControllerHooks(
        buildPayStateRequest({
          isPostQuote: true,
          paymentToken: PAYMENT_TOKEN,
          quotes: [{ strategy: 'relay' }],
          sourceAmounts: [{ targetTokenAddress: PAYMENT_TOKEN.address }],
        }),
      );

      const result = await hooks.publish?.(PREDICT_WITHDRAW_TX);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });
  });
});
