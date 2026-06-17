import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { hasPriorMoneyDeposit } from './firstTimeDeposit';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';

jest.mock('../../../../selectors/transactionController', () => ({
  selectNonReplacedTransactions: jest.fn(),
}));

const mockedSelectNonReplacedTransactions =
  selectNonReplacedTransactions as unknown as jest.MockedFunction<
    (state: unknown) => TransactionMeta[]
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
