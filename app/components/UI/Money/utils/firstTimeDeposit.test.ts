import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  hasPriorMoneyDeposit,
  shouldShowMoneyFirstTimeDepositAnimation,
} from './firstTimeDeposit';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';

jest.mock('../../../../selectors/transactionController', () => ({
  selectNonReplacedTransactions: jest.fn(),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectMoneyFirstTimeDepositAnimationEnabledFlag: jest.fn(),
}));

const mockedSelectNonReplacedTransactions =
  selectNonReplacedTransactions as unknown as jest.MockedFunction<
    (state: unknown) => TransactionMeta[]
  >;

const mockedFlagSelector =
  selectMoneyFirstTimeDepositAnimationEnabledFlag as unknown as jest.MockedFunction<
    (state: unknown) => boolean
  >;

const baseTx = {
  status: TransactionStatus.confirmed,
  time: 0,
  txParams: {},
} as unknown as TransactionMeta;

const makeTx = (
  id: string,
  type: TransactionType,
  nested?: { type: TransactionType }[],
): TransactionMeta =>
  ({
    ...baseTx,
    id,
    type,
    nestedTransactions: nested,
  }) as unknown as TransactionMeta;

const mockState = {} as never;

describe('hasPriorMoneyDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when transaction list is empty', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(false);
  });

  it('returns false when only transaction is the current one', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(false);
  });

  it('returns true when a prior top-level deposit exists', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
      makeTx('prior-tx', TransactionType.moneyAccountDeposit),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(true);
  });

  it('returns true when a prior nested batch deposit exists', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
      makeTx('prior-batch', TransactionType.batch, [
        { type: TransactionType.moneyAccountDeposit },
      ]),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(true);
  });

  it('returns false when prior transactions are non-deposit types', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
      makeTx('other-1', TransactionType.moneyAccountWithdraw),
      makeTx('other-2', TransactionType.contractInteraction),
      makeTx('other-3', TransactionType.incoming),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(false);
  });
});

describe('shouldShowMoneyFirstTimeDepositAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFlagSelector.mockReturnValue(true);
    mockedSelectNonReplacedTransactions.mockReturnValue([]);
  });

  it('returns true for a first money deposit with the feature enabled', () => {
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);
    mockedSelectNonReplacedTransactions.mockReturnValue([tx]);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(true);
  });

  it('returns true for a first nested batch money deposit', () => {
    const tx = makeTx('current-tx', TransactionType.batch, [
      { type: TransactionType.moneyAccountDeposit },
    ]);
    mockedSelectNonReplacedTransactions.mockReturnValue([tx]);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(true);
  });

  it('returns false when the transaction is not a money deposit', () => {
    const tx = makeTx('current-tx', TransactionType.contractInteraction);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });

  it('returns false when the feature flag is disabled', () => {
    mockedFlagSelector.mockReturnValue(false);
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });

  it('returns false when a prior money deposit exists', () => {
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);
    mockedSelectNonReplacedTransactions.mockReturnValue([
      tx,
      makeTx('prior-tx', TransactionType.moneyAccountDeposit),
    ]);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });
});
