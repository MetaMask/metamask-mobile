import { renderHook } from '@testing-library/react-hooks';
import { useSubscriptionLinkedMusdHoldings } from './useSubscriptionLinkedMusdHoldings';

const ETH_CHAIN_ID = '0x1';
const LINEA_CHAIN_ID = '0xe708';
const MUSD_ETH = '0x1111111111111111111111111111111111111111';
const MUSD_LINEA = '0x2222222222222222222222222222222222222222';

const ACCOUNT_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ACCOUNT_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_DECIMALS: 6,
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {
    '0x1': '0x1111111111111111111111111111111111111111',
    '0xe708': '0x2222222222222222222222222222222222222222',
  },
}));

const mockSubscriptionAccounts = jest.fn();
const mockTokenBalances = jest.fn();
const mockMusdChainIds = jest.fn();

jest.mock('../../../../selectors/rewards', () => ({
  selectCurrentSubscriptionAccounts: 'selectCurrentSubscriptionAccounts',
}));

jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: 'selectAllTokenBalances',
}));

jest.mock('../../Earn/selectors/featureFlags', () => ({
  selectMusdBalanceChainIds: 'selectMusdBalanceChainIds',
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: string) => {
    switch (selector) {
      case 'selectCurrentSubscriptionAccounts':
        return mockSubscriptionAccounts();
      case 'selectAllTokenBalances':
        return mockTokenBalances();
      case 'selectMusdBalanceChainIds':
        return mockMusdChainIds();
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

describe('useSubscriptionLinkedMusdHoldings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionAccounts.mockReturnValue([
      { account: `eip155:1:${ACCOUNT_A}`, hasOptedIn: true },
    ]);
    mockTokenBalances.mockReturnValue({});
    mockMusdChainIds.mockReturnValue([ETH_CHAIN_ID, LINEA_CHAIN_ID]);
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: false,
      hasMoneyAccount: false,
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
  });

  it('sums mUSD across chains for an opted-in linked account', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(1500) },
        [LINEA_CHAIN_ID]: { [MUSD_LINEA]: musdMinimalUnits(500) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('2000');
  });

  it('sums mUSD across multiple opted-in linked accounts', () => {
    mockSubscriptionAccounts.mockReturnValue([
      { account: `eip155:1:${ACCOUNT_A}`, hasOptedIn: true },
      { account: `eip155:1:${ACCOUNT_B}`, hasOptedIn: true },
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
      { account: `eip155:1:${ACCOUNT_A}`, hasOptedIn: false },
      { account: `eip155:1:${ACCOUNT_B}`, hasOptedIn: true },
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
      { account: 'solana:mainnet:somebase58address', hasOptedIn: true },
      { account: 'not-a-caip-id', hasOptedIn: true },
      { account: `eip155:1:${ACCOUNT_A}`, hasOptedIn: true },
    ]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(42) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('42');
  });

  it('ignores chains that are not enabled for mUSD balances', () => {
    mockMusdChainIds.mockReturnValue([ETH_CHAIN_ID]);
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(30) },
        [LINEA_CHAIN_ID]: { [MUSD_LINEA]: musdMinimalUnits(70) },
      },
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('30');
  });

  it('adds the Money Account total when the feature is provisioned', () => {
    mockTokenBalances.mockReturnValue({
      [ACCOUNT_A]: {
        [ETH_CHAIN_ID]: { [MUSD_ETH]: musdMinimalUnits(1000) },
      },
    });
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '250.5',
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('1250.5');
  });

  it('returns undefined while the Money Account balance is loading', () => {
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: undefined,
      isBalanceLoading: true,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBeUndefined();
  });

  it('returns undefined when the Money Account balance fetch fails', () => {
    mockMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: undefined,
      isBalanceLoading: false,
      isBalanceFetchError: true,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBeUndefined();
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
    });
    mockMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '999',
      isBalanceLoading: false,
      isBalanceFetchError: false,
    });

    const { result } = renderHook(() => useSubscriptionLinkedMusdHoldings());

    expect(result.current.holdingsUsd).toBe('15');
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
