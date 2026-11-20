import { selectMoneySplashSeen } from '../../../../reducers/user/selectors';
import { selectLastKnownMoneyBalance } from '../../../../core/redux/slices/moneyBalance';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import {
  selectHasUsedMoneyAccount,
  selectIsMoneySplashRedirectNeeded,
  selectMoneyEntryContext,
} from './entry';

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneySplashSeen: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/moneyBalance', () => ({
  selectLastKnownMoneyBalance: jest.fn(),
}));

jest.mock('../../../../selectors/transactionController', () => ({
  selectNonReplacedTransactions: jest.fn(),
}));

jest.mock('./visibility', () => ({
  selectMoneyAccountAccessBlockReason: jest.fn(),
}));

const mockSelectMoneySplashSeen = jest.mocked(selectMoneySplashSeen);
const mockSelectLastKnownMoneyBalance = jest.mocked(
  selectLastKnownMoneyBalance,
);
const mockSelectNonReplacedTransactions = jest.mocked(
  selectNonReplacedTransactions,
);
const mockSelectMoneyAccountAccessBlockReason = jest.mocked(
  selectMoneyAccountAccessBlockReason,
);

const makeBalance = (value: string) => ({
  address: '0x1',
  value,
  currency: 'USD',
  updatedAt: 0,
});

const setUsageInputs = ({
  hasSeenSplash = false,
  lastKnownBalance = null,
  transactions = [],
}: {
  hasSeenSplash?: boolean;
  lastKnownBalance?: ReturnType<typeof makeBalance> | null;
  transactions?: unknown[];
} = {}) => {
  mockSelectMoneySplashSeen.mockReturnValue(hasSeenSplash);
  mockSelectLastKnownMoneyBalance.mockReturnValue(lastKnownBalance);
  mockSelectNonReplacedTransactions.mockReturnValue(
    transactions as unknown as ReturnType<typeof selectNonReplacedTransactions>,
  );
};

describe('selectHasUsedMoneyAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUsageInputs();
  });

  it('returns false without a balance or deposit history', () => {
    expect(selectHasUsedMoneyAccount({} as never)).toBe(false);
  });

  it('returns true for a persisted positive balance', () => {
    setUsageInputs({ lastKnownBalance: makeBalance('$12.34') });

    expect(selectHasUsedMoneyAccount({} as never)).toBe(true);
  });

  it('returns true for a confirmed Money deposit', () => {
    setUsageInputs({
      transactions: [
        {
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
        },
      ],
    });

    expect(selectHasUsedMoneyAccount({} as never)).toBe(true);
  });

  it('returns true for a confirmed Money withdrawal', () => {
    setUsageInputs({
      transactions: [
        {
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
        },
      ],
    });

    expect(selectHasUsedMoneyAccount({} as never)).toBe(true);
  });
});

describe('selectIsMoneySplashRedirectNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUsageInputs();
  });

  it.each([
    { hasSeenSplash: false, lastKnownBalance: null, expectedRedirect: true },
    {
      hasSeenSplash: false,
      lastKnownBalance: makeBalance('$12.34'),
      expectedRedirect: false,
    },
    {
      hasSeenSplash: true,
      lastKnownBalance: null,
      expectedRedirect: false,
    },
  ])(
    'returns $expectedRedirect for $hasSeenSplash and $lastKnownBalance',
    ({ hasSeenSplash, lastKnownBalance, expectedRedirect }) => {
      setUsageInputs({ hasSeenSplash, lastKnownBalance });

      expect(selectIsMoneySplashRedirectNeeded({} as never)).toBe(
        expectedRedirect,
      );
    },
  );
});

describe('selectMoneyEntryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUsageInputs();
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue(undefined);
  });

  it('combines access policy and splash state', () => {
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue('geo_blocked');

    const result = selectMoneyEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: 'geo_blocked',
      isSplashRedirectNeeded: true,
    });
  });

  it('skips the splash when the user has already used Money', () => {
    setUsageInputs({ lastKnownBalance: makeBalance('$12.34') });

    const result = selectMoneyEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: undefined,
      isSplashRedirectNeeded: false,
    });
  });

  it('returns the same context reference when selector inputs are unchanged', () => {
    const state = {} as never;

    const firstResult = selectMoneyEntryContext(state);
    const secondResult = selectMoneyEntryContext(state);

    expect(secondResult).toBe(firstResult);
  });
});
