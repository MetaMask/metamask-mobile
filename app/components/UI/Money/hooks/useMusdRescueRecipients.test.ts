import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import useMusdRescueRecipients from './useMusdRescueRecipients';
import useMoneyAccountInfo from './useMoneyAccountInfo';
import { selectAccountGroups } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./useMoneyAccountInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountGroups: jest.fn(),
  }),
);

jest.mock('../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: jest.fn(),
}));

const ENTROPY_ID = 'entropy-1';
const WALLET_ID = `entropy:${ENTROPY_ID}`;
const OTHER_WALLET_ID = 'entropy:other-srp';

const MONEY_ACCOUNT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const SAME_SRP_EVM_ADDRESS = '0x1111111111111111111111111111111111111111';
const SAME_SRP_EVM_ADDRESS_2 = '0x2222222222222222222222222222222222222222';
const SAME_SRP_EVM_ADDRESS_3 = '0x3333333333333333333333333333333333333333';
const SAME_SRP_SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112';
const OTHER_SRP_EVM_ADDRESS = '0x4444444444444444444444444444444444444444';

const createAccount = ({
  id,
  address,
  type = EthAccountType.Eoa,
  scopes = [EthScope.Mainnet],
  name,
}: {
  id: string;
  address: string;
  type?: string;
  scopes?: string[];
  name: string;
}): InternalAccount =>
  ({
    id,
    address,
    type,
    scopes,
    methods: [],
    metadata: { name },
    options: {},
  }) as unknown as InternalAccount;

const MONEY_ACCOUNT = {
  id: 'money-account',
  address: MONEY_ACCOUNT_ADDRESS,
  type: EthAccountType.Eoa,
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic' as const,
      id: ENTROPY_ID,
      derivationPath: "m/44'/60'/0'/0/0",
      groupIndex: 0,
    },
    exportable: false,
  },
};

const ACCOUNTS: Record<string, InternalAccount> = {
  'money-account': createAccount({
    id: 'money-account',
    address: MONEY_ACCOUNT_ADDRESS,
    name: 'Money Account',
  }),
  'same-srp-evm': createAccount({
    id: 'same-srp-evm',
    address: SAME_SRP_EVM_ADDRESS,
    name: 'Account 1',
  }),
  'same-srp-evm-2': createAccount({
    id: 'same-srp-evm-2',
    address: SAME_SRP_EVM_ADDRESS_2,
    name: 'Account 2',
  }),
  'same-srp-evm-3': createAccount({
    id: 'same-srp-evm-3',
    address: SAME_SRP_EVM_ADDRESS_3,
    name: 'Account 3',
  }),
  'same-srp-solana': createAccount({
    id: 'same-srp-solana',
    address: SAME_SRP_SOLANA_ADDRESS,
    type: 'solana:data-account',
    scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    name: 'Solana 1',
  }),
  'other-srp-evm': createAccount({
    id: 'other-srp-evm',
    address: OTHER_SRP_EVM_ADDRESS,
    name: 'Other SRP Account',
  }),
};

// Group 0 holds the Money Account plus one other EVM account and a Solana
// account; group 1 holds a sibling EVM account. Both groups belong to the
// same SRP wallet, so all three EVM accounts (minus the Money Account
// address itself) are selectable recipients.
const ACCOUNT_GROUPS: AccountGroupObject[] = [
  {
    id: `${WALLET_ID}/0`,
    type: 'multichain-account',
    metadata: { name: 'Group 0' },
    accounts: ['money-account', 'same-srp-evm', 'same-srp-solana'],
  },
  {
    id: `${WALLET_ID}/1`,
    type: 'multichain-account',
    metadata: { name: 'Group 1' },
    accounts: ['same-srp-evm-2', 'same-srp-evm-3'],
  },
  {
    id: `${OTHER_WALLET_ID}/0`,
    type: 'multichain-account',
    metadata: { name: 'Other wallet' },
    accounts: ['other-srp-evm'],
  },
] as unknown as AccountGroupObject[];

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);

function setup(
  options: {
    /** `undefined` is a meaningful value (no Money Account), so presence is checked. */
    primaryMoneyAccount?: never;
    accountGroups?: AccountGroupObject[];
    accountsById?: Record<string, InternalAccount>;
  } = {},
) {
  const primaryMoneyAccount =
    'primaryMoneyAccount' in options
      ? options.primaryMoneyAccount
      : (MONEY_ACCOUNT as never);
  const accountGroups = options.accountGroups ?? ACCOUNT_GROUPS;
  const accountsById = options.accountsById ?? ACCOUNTS;

  mockUseMoneyAccountInfo.mockReturnValue({
    isMoneyAccountFeatureEnabled: true,
    hasMoneyAccount: Boolean(primaryMoneyAccount),
    primaryMoneyAccount,
  });

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectAccountGroups) {
      return accountGroups;
    }
    if (selector === selectInternalAccountsById) {
      return accountsById;
    }
    return undefined;
  });
}

const EXPECTED_RECIPIENTS = [
  {
    id: 'same-srp-evm',
    address: SAME_SRP_EVM_ADDRESS,
    name: 'Account 1',
    groupId: `${WALLET_ID}/0`,
    groupName: 'Group 0',
  },
  {
    id: 'same-srp-evm-2',
    address: SAME_SRP_EVM_ADDRESS_2,
    name: 'Account 2',
    groupId: `${WALLET_ID}/1`,
    groupName: 'Group 1',
  },
  {
    id: 'same-srp-evm-3',
    address: SAME_SRP_EVM_ADDRESS_3,
    name: 'Account 3',
    groupId: `${WALLET_ID}/1`,
    groupName: 'Group 1',
  },
];

describe('useMusdRescueRecipients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('returns every EVM account across all groups of the Money Account SRP', () => {
    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual(EXPECTED_RECIPIENTS);
  });

  it('excludes the Money Account address from the recipients', () => {
    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(
      result.current.recipients.some(
        (recipient) =>
          recipient.address.toLowerCase() ===
          MONEY_ACCOUNT_ADDRESS.toLowerCase(),
      ),
    ).toBe(false);
  });

  it('excludes non-EVM accounts of the same SRP', () => {
    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(
      result.current.recipients.some(
        (recipient) => recipient.address === SAME_SRP_SOLANA_ADDRESS,
      ),
    ).toBe(false);
  });

  it('excludes accounts from other SRPs', () => {
    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(
      result.current.recipients.some(
        (recipient) => recipient.address === OTHER_SRP_EVM_ADDRESS,
      ),
    ).toBe(false);
  });

  it('skips unknown account ids referenced by a group', () => {
    setup({
      accountsById: {
        // Only the Money Account and one same-SRP account resolve; the rest
        // of the group's ids are dangling and must be skipped.
        'money-account': ACCOUNTS['money-account'],
        'same-srp-evm': ACCOUNTS['same-srp-evm'],
      } as Record<string, InternalAccount>,
    });

    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual([EXPECTED_RECIPIENTS[0]]);
  });

  it('returns an empty list when there is no primary Money Account', () => {
    setup({ primaryMoneyAccount: undefined as never });

    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual([]);
  });

  it('returns an empty list when the Money Account has no entropy metadata', () => {
    setup({
      primaryMoneyAccount: {
        ...MONEY_ACCOUNT,
        options: { exportable: false },
      } as never,
    });

    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual([]);
  });

  it('returns an empty list when the wallet has no account groups', () => {
    setup({ accountGroups: [] });

    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual([]);
  });
});
