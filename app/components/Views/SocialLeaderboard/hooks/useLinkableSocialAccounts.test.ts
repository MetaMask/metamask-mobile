import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectInternalAccountsById,
  selectInternalEvmAccounts,
} from '../../../../selectors/accountsController';
import { selectBalanceForAllWalletsAndChains } from '../../../../selectors/assets/balances';
import { selectAccountToGroupMap } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllAccountGroupIconSeedAddresses } from '../../../../selectors/multichainAccounts/accounts';
import { selectVisibleAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/manageAccounts';
import { renderShortAddress } from '../../../../util/address';
import { useLinkableSocialAccounts } from './useLinkableSocialAccounts';

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
  allBalances?: {
    wallets: Record<
      string,
      {
        groups: Record<
          string,
          {
            groupId: string;
            totalBalanceInUserCurrency: number;
            userCurrency: string;
          }
        >;
      }
    >;
  };
}

const buildWallet = (
  entries: { groupId: string; total: number; currency?: string }[],
) => ({
  wallets: {
    'wallet-1': {
      groups: Object.fromEntries(
        entries.map(({ groupId, total, currency = 'usd' }) => [
          groupId,
          {
            groupId,
            totalBalanceInUserCurrency: total,
            userCurrency: currency,
          },
        ]),
      ),
    },
  },
});

const mockSelectors = ({
  evmAccounts,
  accountsById,
  accountSections,
  seedAddressByGroupId,
  accountToGroupMap = {},
  allBalances = { wallets: {} },
}: SelectorValues) => {
  const values = new Map<unknown, unknown>([
    [selectInternalEvmAccounts, evmAccounts],
    [selectInternalAccountsById, accountsById],
    [selectVisibleAccountGroupsByWallet, accountSections],
    [selectAllAccountGroupIconSeedAddresses, seedAddressByGroupId],
    [selectBalanceForAllWalletsAndChains, allBalances],
    [selectAccountToGroupMap, accountToGroupMap],
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
  });

  it('labels each row with its account group total', () => {
    mockSelectors({
      ...defaultSelectors,
      allBalances: buildWallet([{ groupId: 'group-1', total: 12.5 }]),
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
      allBalances: buildWallet([{ groupId: 'group-1', total: 100 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('$100.00');
  });

  it('leaves the label blank for a zero balance', () => {
    mockSelectors({
      ...defaultSelectors,
      allBalances: buildWallet([{ groupId: 'group-1', total: 0 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('');
  });

  it('leaves the label blank when the group has no balance entry yet', () => {
    mockSelectors({
      ...defaultSelectors,
      allBalances: { wallets: {} },
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
      allBalances: buildWallet([
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
      allBalances: buildWallet([{ groupId: 'group-1', total: 42 }]),
    });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0].balanceLabel).toBe('$42.00');
  });
});
