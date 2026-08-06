import { renderHook } from '@testing-library/react-hooks';
import { useSubscriptionLinkedMusdHoldings } from './useSubscriptionLinkedMusdHoldings';

const ETH_CHAIN_ID = '0x1';
const LINEA_CHAIN_ID = '0xe708';
const MONAD_CHAIN_ID = '0x8f';
const BSC_CHAIN_ID = '0x38';
const MUSD_ETH = '0x1111111111111111111111111111111111111111';
const MUSD_LINEA = '0x2222222222222222222222222222222222222222';
const MUSD_MONAD = '0x3333333333333333333333333333333333333333';
const MUSD_BSC = '0x4444444444444444444444444444444444444444';

const ACCOUNT_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ACCOUNT_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const MONEY_ACCOUNT = '0xcccccccccccccccccccccccccccccccccccccccc';
const SUBSCRIPTION_ID = 'sub-1';

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_DECIMALS: 6,
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {
    '0x1': '0x1111111111111111111111111111111111111111',
    '0xe708': '0x2222222222222222222222222222222222222222',
    '0x8f': '0x3333333333333333333333333333333333333333',
    '0x38': '0x4444444444444444444444444444444444444444',
  },
}));

const mockSubscriptionAccounts = jest.fn();
const mockTokenBalances = jest.fn();

jest.mock('../../../../selectors/rewards', () => ({
  selectCurrentSubscriptionAccounts: 'selectCurrentSubscriptionAccounts',
}));

jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: 'selectAllTokenBalances',
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: string) => {
    switch (selector) {
      case 'selectCurrentSubscriptionAccounts':
        return mockSubscriptionAccounts();
      case 'selectAllTokenBalances':
        return mockTokenBalances();
      default:
        return undefined;
    }
  },
}));

const mockMoneyAccountInfo = jest.fn();
const mockMoneyAccountBalance = jest.fn();

jest.mock('../../Money/hooks/useMoneyAccountInfo', () => ({
  __esModule: true,
  default: () => mockMoneyAccountInfo(),
}));

jest.mock('../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => mockMoneyAccountBalance(),
}));

/** 1 mUSD == 1e6 minimal units at MUSD_DECIMALS = 6. */
const musdMinimalUnits = (amount: number): string =>
  `0x${(amount * 1_000_000).toString(16)}`;

const linkedAccount = (address: string) => ({
  account: `eip155:1:${address}`,
  hasOptedIn: true,
  subscriptionId: SUBSCRIPTION_ID,
});

describe('useSubscriptionLinkedMusdHoldings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionAccounts.mockReturnValue([linkedAccount(ACCOUNT_A)]);
    mockTokenBalances.mockReturnValue({});
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: false,
      hasMoneyAccount: false,
      primaryMoneyAccount: undefined,
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: undefined,
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });
  });

  it('returns zero when no linked account holds mUSD', () => {
    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('0');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('sums mUSD across chains for an opted-in linked account', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(1500) },
        [LINEA_CHAIN_ID]: { [MUSD_LINEA]: musdMinimalUnits(500) },
        [MONAD_CHAIN_ID]: { [MUSD_MONAD]: musdMinimalUnits(250) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('2250');
  });

  it('sums mUSD across multiple opted-in linked accounts', () => {
    mockSubscriptionAccounts.mockReturnValue([
      linkedAccount(ACCOUNT_A),
      linkedAccount(ACCOUNT_B),
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(100) },
      },
      [ACCOUNT_B]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(250) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('350');
  });

  it('excludes accounts that have not opted in', () => {
    mockSubscriptionAccounts.mockReturnValue([
      { ...linkedAccount(ACCOUNT_A), hasOptedIn: false },
      linkedAccount(ACCOUNT_B),
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(999) },
      },
      [ACCOUNT_B]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(10) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('10');
  });

  it('excludes accounts with no subscription id', () => {
    mockSubscriptionAccounts.mockReturnValue([
      { ...linkedAccount(ACCOUNT_A), subscriptionId: null },
      linkedAccount(ACCOUNT_B),
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(999) },
      },
      [ACCOUNT_B]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(10) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('10');
  });

  it('excludes non-EVM and malformed CAIP accounts', () => {
    mockSubscriptionAccounts.mockReturnValue([
      {
        account: 'solana:mainnet:somebase58address',
        hasOptedIn: true,
        subscriptionId: SUBSCRIPTION_ID,
      },
      {
        account: 'not-a-caip-id',
        hasOptedIn: true,
        subscriptionId: SUBSCRIPTION_ID,
      },
      linkedAccount(ACCOUNT_A),
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(42) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('42');
  });

  it('counts only the Rewards-owned chain list, ignoring other mUSD chains', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(30) },
        [LINEA_CHAIN_ID]: { [MUSD_LINEA]: musdMinimalUnits(70) },
        [MONAD_CHAIN_ID]: { [MUSD_MONAD]: musdMinimalUnits(5) },
        // BSC resolves an mUSD address but is deliberately not counted.
        [BSC_CHAIN_ID]: { [MUSD_BSC]: musdMinimalUnits(1000) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('105');
  });

  it('adds the Money Account total when it is linked to the subscription', () => {
    mockSubscriptionAccounts.mockReturnValue([
      linkedAccount(ACCOUNT_A),
      linkedAccount(MONEY_ACCOUNT),
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(1000) },
      },
    });
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
      primaryMoneyAccount: { address: MONEY_ACCOUNT },
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '250.5',
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    // Whole dollars: 1000 + 250.5 truncated.
    expect(result.current.holdingsUsd).toBe('1250');
  });

  it('does not double-count Money Account mUSD already inside totalBalance', () => {
    mockSubscriptionAccounts.mockReturnValue([
      linkedAccount(ACCOUNT_A),
      linkedAccount(MONEY_ACCOUNT),
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(100) },
      },
      [MONEY_ACCOUNT]: {
        // Already reported inside totalBalance — must not be added again.
        [MONAD_CHAIN_ID]: { [MUSD_MONAD]: musdMinimalUnits(700) },
        // Held on another chain — totalBalance does not cover it, so it counts.
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(25) },
      },
    });
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
      primaryMoneyAccount: { address: MONEY_ACCOUNT },
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '900',
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    // 100 (wallet) + 25 (money account, non-Monad) + 900 (totalBalance).
    expect(result.current.holdingsUsd).toBe('1025');
  });

  it('ignores the Money Account balance when it is not linked to the subscription', () => {
    mockSubscriptionAccounts.mockReturnValue([linkedAccount(ACCOUNT_A)]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(15) },
      },
    });
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
      primaryMoneyAccount: { address: MONEY_ACCOUNT },
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '999',
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('15');
    expect(result.current.hasError).toBe(false);
  });

  it('reports loading while a linked Money Account balance is in flight', () => {
    mockSubscriptionAccounts.mockReturnValue([linkedAccount(MONEY_ACCOUNT)]);
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
      primaryMoneyAccount: { address: MONEY_ACCOUNT },
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: undefined,
      isBalanceLoading: true,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('reports an error when a linked Money Account balance fetch fails', () => {
    mockSubscriptionAccounts.mockReturnValue([linkedAccount(MONEY_ACCOUNT)]);
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
      primaryMoneyAccount: { address: MONEY_ACCOUNT },
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: undefined,
      isBalanceLoading: false,
      isBalanceFetchError: true,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  it('uses the wallet-only total when Money Account is not provisioned', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(15) },
      },
    });
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: false,
      primaryMoneyAccount: undefined,
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '999',
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('15');
  });

  it('truncates sub-dollar precision so the request body is cache-stable', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(233.208062) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('233');
  });

  it('skips zero balances and missing balance entries', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: '0x0' },
        [LINEA_CHAIN_ID]: {},
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('0');
  });

  it('handles an undefined subscription accounts list', () => {
    mockSubscriptionAccounts.mockReturnValue(undefined);
    mockTokenBalances.mockReturnValue(undefined);

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('0');
  });
});
