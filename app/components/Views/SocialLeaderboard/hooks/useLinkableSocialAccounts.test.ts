import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectInternalAccountsById,
  selectInternalEvmAccounts,
} from '../../../../selectors/accountsController';
import { selectUnifiedBalancesByAccountGroup } from './selectUnifiedBalancesByAccountGroup';
import {
  selectAccountToGroupMap,
  selectSelectedAccountGroupId,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllAccountGroupIconSeedAddresses } from '../../../../selectors/multichainAccounts/accounts';
import { selectVisibleAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/manageAccounts';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { renderShortAddress } from '../../../../util/address';
import { clearPortfolioTotalCache } from './portfolioBalance';
import { useLinkableSocialAccounts } from './useLinkableSocialAccounts';
import { useNonTokenContribution } from './useNonTokenContribution';

jest.mock('./useNonTokenContribution', () => ({
  useNonTokenContribution: jest.fn(),
}));

jest.mock('./selectUnifiedBalancesByAccountGroup', () => {
  const selector = jest.fn();
  return {
    selectUnifiedBalancesByAccountGroup: () => selector,
  };
});

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({ popularNetworks: [] as string[] }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const EVM_ADDRESS_1 = '0x1111111111111111111111111111111111111111';
const EVM_ADDRESS_2 = '0x2222222222222222222222222222222222222222';
const SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112';
const GROUP_1_SOLANA_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const evmAccount1 = {
  id: 'evm-1',
  address: EVM_ADDRESS_1,
  type: 'eip155:eoa',
  scopes: ['eip155:0'],
  metadata: { name: 'Internal One' },
};
const evmAccount2 = {
  id: 'evm-2',
  address: EVM_ADDRESS_2,
  type: 'eip155:eoa',
  scopes: ['eip155:0'],
  metadata: { name: '' },
};
const group1SolanaAccount = {
  id: 'sol-group-1',
  address: GROUP_1_SOLANA_ADDRESS,
  type: 'solana:data-account',
  scopes: [SOLANA_MAINNET],
  metadata: { name: 'Solana Account 1' },
};
const solanaAccount = {
  id: 'sol-1',
  address: SOLANA_ADDRESS,
  type: 'solana:data-account',
  scopes: [SOLANA_MAINNET],
  metadata: { name: 'Solana' },
};

interface SelectorValues {
  evmAccounts: unknown[];
  accountsById: Record<string, unknown>;
  accountSections: unknown[];
  seedAddressByGroupId: Record<string, string>;
  accountToGroupMap?: Record<string, { id: string }>;
  selectedGroupId?: string;
  privacyMode?: boolean;
  unifiedBalances?: Record<
    string,
    {
      totalBalanceInUserCurrency: number;
      userCurrency: string;
    }
  >;
}

const buildBalances = (
  entries: { groupId: string; total: number; currency?: string }[],
) =>
  Object.fromEntries(
    entries.map(({ groupId, total, currency = 'usd' }) => [
      groupId,
      {
        totalBalanceInUserCurrency: total,
        userCurrency: currency,
      },
    ]),
  );

const noExtras = { totalFiat: 0, isLoading: false };

const unifiedBalanceSelector = selectUnifiedBalancesByAccountGroup();

const mockSelectors = ({
  evmAccounts,
  accountsById,
  accountSections,
  seedAddressByGroupId,
  accountToGroupMap = {},
  selectedGroupId,
  privacyMode = false,
  unifiedBalances = {},
}: SelectorValues) => {
  const values = new Map<unknown, unknown>([
    [selectInternalEvmAccounts, evmAccounts],
    [selectInternalAccountsById, accountsById],
    [selectVisibleAccountGroupsByWallet, accountSections],
    [selectAllAccountGroupIconSeedAddresses, seedAddressByGroupId],
    [selectAccountToGroupMap, accountToGroupMap],
    [selectSelectedAccountGroupId, selectedGroupId],
    [selectPrivacyMode, privacyMode],
    [unifiedBalanceSelector, unifiedBalances],
  ]);
  (useSelector as jest.Mock).mockImplementation((selector) =>
    values.get(selector),
  );
};

const defaultSelectors: SelectorValues = {
  evmAccounts: [evmAccount1, evmAccount2],
  accountsById: {
    [evmAccount1.id]: evmAccount1,
    [evmAccount2.id]: evmAccount2,
    [group1SolanaAccount.id]: group1SolanaAccount,
    [solanaAccount.id]: solanaAccount,
  },
  accountSections: [
    {
      title: 'Wallet 1',
      data: [
        {
          id: 'group-1',
          accounts: [evmAccount1.id, group1SolanaAccount.id],
          metadata: { name: 'Account 1' },
        },
        { id: 'group-2', accounts: [evmAccount2.id], metadata: { name: '' } },
        {
          id: 'group-sol',
          accounts: [solanaAccount.id],
          metadata: { name: 'Solana only' },
        },
      ],
    },
  ],
  seedAddressByGroupId: {
    'group-1': EVM_ADDRESS_1,
    'group-2': EVM_ADDRESS_2,
    'group-sol': SOLANA_ADDRESS,
  },
};

describe('useLinkableSocialAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPortfolioTotalCache();
    jest.mocked(useNonTokenContribution).mockReturnValue(noExtras);
  });

  it('labels each row with its account group total', () => {
    mockSelectors({
      ...defaultSelectors,
      unifiedBalances: buildBalances([{ groupId: 'group-1', total: 12.5 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0]).toEqual({
      id: evmAccount1.id,
      name: 'Account 1',
      address: EVM_ADDRESS_1,
      balanceLabel: '$12.50',
      linkedAddresses: [
        `eip155:1:${EVM_ADDRESS_1}`,
        `${SOLANA_MAINNET}:${GROUP_1_SOLANA_ADDRESS}`,
      ],
    });
  });

  it('counts every address in the group, not only its EVM address', () => {
    mockSelectors({
      ...defaultSelectors,
      unifiedBalances: buildBalances([{ groupId: 'group-1', total: 100 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('$100.00');
  });

  it('leaves the label blank for a zero balance', () => {
    mockSelectors({
      ...defaultSelectors,
      unifiedBalances: buildBalances([{ groupId: 'group-1', total: 0 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('');
  });

  it('leaves the label blank when the group has no balance entry yet', () => {
    mockSelectors({
      ...defaultSelectors,
      unifiedBalances: {},
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current.map((account) => account.balanceLabel)).toEqual([
      '',
      '',
    ]);
  });

  it('uses the balance currency rather than the display currency setting', () => {
    mockSelectors({
      ...defaultSelectors,
      unifiedBalances: buildBalances([
        { groupId: 'group-1', total: 12.5, currency: 'eur' },
      ]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toContain('€');
  });

  it('falls back to the short address when neither the group nor the account has a name', () => {
    mockSelectors(defaultSelectors);

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[1]).toEqual({
      id: evmAccount2.id,
      name: renderShortAddress(EVM_ADDRESS_2),
      address: EVM_ADDRESS_2,
      balanceLabel: '',
      linkedAddresses: [`eip155:1:${EVM_ADDRESS_2}`],
    });
  });

  it('leaves out groups without an EVM account', () => {
    mockSelectors(defaultSelectors);

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current.map((account) => account.id)).toEqual([
      evmAccount1.id,
      evmAccount2.id,
    ]);
  });

  it('falls back to the internal EVM accounts when there are no account groups', () => {
    mockSelectors({ ...defaultSelectors, accountSections: [] });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current.map((account) => account.name)).toEqual([
      'Internal One',
      renderShortAddress(EVM_ADDRESS_2),
    ]);
  });

  it('still resolves a balance through the account-to-group map on that fallback', () => {
    mockSelectors({
      ...defaultSelectors,
      accountSections: [],
      accountToGroupMap: { [evmAccount1.id]: { id: 'group-1' } },
      unifiedBalances: buildBalances([{ groupId: 'group-1', total: 42 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('$42.00');
  });

  it('adds perps, predictions, DeFi, and money to the selected account', () => {
    mockSelectors({
      ...defaultSelectors,
      selectedGroupId: 'group-1',
      unifiedBalances: buildBalances([
        { groupId: 'group-1', total: 12.5 },
        { groupId: 'group-2', total: 5 },
      ]),
    });
    jest.mocked(useNonTokenContribution).mockReturnValue({
      totalFiat: 17.5,
      isLoading: false,
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current.map((account) => account.balanceLabel)).toEqual([
      '$30.00',
      '$5.00',
    ]);
  });

  it('keeps the aggregated token total while perps or predictions are loading', () => {
    mockSelectors({
      ...defaultSelectors,
      selectedGroupId: 'group-1',
      unifiedBalances: buildBalances([{ groupId: 'group-1', total: 12.5 }]),
    });
    jest.mocked(useNonTokenContribution).mockReturnValue({
      totalFiat: 0,
      isLoading: true,
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('$12.50');
  });

  it('returns a blank label when balances are hidden', () => {
    mockSelectors({
      ...defaultSelectors,
      privacyMode: true,
      unifiedBalances: buildBalances([{ groupId: 'group-1', total: 12.5 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('');
  });
});
