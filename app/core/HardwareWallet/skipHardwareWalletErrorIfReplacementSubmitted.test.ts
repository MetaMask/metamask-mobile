import {
  Category,
  ErrorCode,
  HardwareWalletError,
  Severity,
} from '@metamask/hw-wallet-sdk';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../Engine';
import { skipHardwareWalletErrorIfReplacementSubmitted } from './skipHardwareWalletErrorIfReplacementSubmitted';

jest.mock('../Engine', () => ({
  context: {
    TransactionController: {
      state: {
        transactions: [],
      },
    },
  },
}));

const ORIGINAL_ID = 'original-tx';
const FROM = '0xabc';
const NONCE = '0x1';
const CHAIN_ID = '0x1';

function createTransaction(
  overrides: Partial<TransactionMeta> & Pick<TransactionMeta, 'id' | 'type'>,
): TransactionMeta {
  const { txParams, ...rest } = overrides;

  return {
    chainId: CHAIN_ID,
    status: TransactionStatus.submitted,
    ...rest,
    txParams: {
      from: FROM,
      nonce: NONCE,
      ...txParams,
    },
  } as TransactionMeta;
}

function originalAndReplacement(
  replacementType: TransactionType.retry | TransactionType.cancel,
): TransactionMeta[] {
  return [
    createTransaction({
      id: ORIGINAL_ID,
      type: TransactionType.simpleSend,
    }),
    createTransaction({
      id: 'replacement-tx',
      type: replacementType,
    }),
  ];
}

function setTransactions(transactions: TransactionMeta[]): void {
  Engine.context.TransactionController.state.transactions = transactions;
}

function createDisconnectError(): Error {
  const error = new Error('DisconnectedDevice');
  error.name = 'DisconnectedDevice';
  return error;
}

function createWrappedDisconnectError(): HardwareWalletError {
  return new HardwareWalletError('DisconnectedDevice', {
    code: ErrorCode.Unknown,
    severity: Severity.Err,
    category: Category.Unknown,
    userMessage: 'DisconnectedDevice',
    cause: createDisconnectError(),
  });
}

function createUserRejectedError(): HardwareWalletError {
  return new HardwareWalletError('User rejected', {
    code: ErrorCode.UserRejected,
    severity: Severity.Err,
    category: Category.UserAction,
    userMessage: 'User rejected',
  });
}

describe('skipHardwareWalletErrorIfReplacementSubmitted', () => {
  const onError = skipHardwareWalletErrorIfReplacementSubmitted(ORIGINAL_ID);

  beforeEach(() => {
    setTransactions([]);
  });

  it('returns true from onError when a retry replacement shares the original nonce and the error is a BLE disconnect', () => {
    setTransactions(originalAndReplacement(TransactionType.retry));

    expect(onError(createDisconnectError())).toBe(true);
  });

  it('returns true from onError when a cancel replacement shares the original nonce and the error is a BLE disconnect', () => {
    setTransactions(originalAndReplacement(TransactionType.cancel));

    expect(onError(createDisconnectError())).toBe(true);
  });

  it('returns true from onError when the keyring wrapped DisconnectedDevice as Unknown', () => {
    setTransactions(originalAndReplacement(TransactionType.retry));

    expect(onError(createWrappedDisconnectError())).toBe(true);
  });

  it('returns false from onError when a replacement exists but the error is a user rejection', () => {
    setTransactions(originalAndReplacement(TransactionType.retry));

    expect(onError(createUserRejectedError())).toBe(false);
  });

  it('returns false from onError when a replacement exists but the error is not a disconnect', () => {
    setTransactions(originalAndReplacement(TransactionType.retry));

    expect(onError(new Error('signing failed'))).toBe(false);
  });

  it('returns false from onError when the error is a BLE disconnect but no replacement exists', () => {
    setTransactions([
      createTransaction({
        id: ORIGINAL_ID,
        type: TransactionType.simpleSend,
      }),
    ]);

    expect(onError(createDisconnectError())).toBe(false);
  });

  it('returns false from onError when the original transaction is missing', () => {
    setTransactions([
      createTransaction({
        id: 'replacement-tx',
        type: TransactionType.retry,
      }),
    ]);

    expect(onError(createDisconnectError())).toBe(false);
  });

  it('returns false from onError when a same-nonce retry exists but is still unapproved', () => {
    setTransactions([
      createTransaction({
        id: ORIGINAL_ID,
        type: TransactionType.simpleSend,
      }),
      createTransaction({
        id: 'replacement-tx',
        type: TransactionType.retry,
        status: TransactionStatus.unapproved,
      }),
    ]);

    expect(onError(createDisconnectError())).toBe(false);
  });

  it('returns false from onError when a same-nonce retry exists but is only signed', () => {
    setTransactions([
      createTransaction({
        id: ORIGINAL_ID,
        type: TransactionType.simpleSend,
      }),
      createTransaction({
        id: 'replacement-tx',
        type: TransactionType.retry,
        status: TransactionStatus.signed,
      }),
    ]);

    expect(onError(createDisconnectError())).toBe(false);
  });

  it('returns false from onError when a leftover same-nonce retry failed', () => {
    setTransactions([
      createTransaction({
        id: ORIGINAL_ID,
        type: TransactionType.simpleSend,
      }),
      createTransaction({
        id: 'replacement-tx',
        type: TransactionType.retry,
        status: TransactionStatus.failed,
      }),
    ]);

    expect(onError(createDisconnectError())).toBe(false);
  });

  it('returns true from onError when a same-nonce retry is confirmed', () => {
    setTransactions([
      createTransaction({
        id: ORIGINAL_ID,
        type: TransactionType.simpleSend,
      }),
      createTransaction({
        id: 'replacement-tx',
        type: TransactionType.retry,
        status: TransactionStatus.confirmed,
      }),
    ]);

    expect(onError(createDisconnectError())).toBe(true);
  });
});
