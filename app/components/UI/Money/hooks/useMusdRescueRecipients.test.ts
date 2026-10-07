import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import useMusdRescueRecipients from './useMusdRescueRecipients';
import useMoneyAccountInfo from './useMoneyAccountInfo';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./useMoneyAccountInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
}));

const ENTROPY_ID = 'entropy-1';
const GROUP_INDEX = 0;
const EXPECTED_GROUP_ID = `entropy:${ENTROPY_ID}/${GROUP_INDEX}`;

const MONEY_ACCOUNT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const SAME_SRP_EVM_ADDRESS = '0x1111111111111111111111111111111111111111';
const SAME_SRP_EVM_ADDRESS_2 = '0x2222222222222222222222222222222222222222';
const SAME_SRP_SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112';

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
      groupIndex: GROUP_INDEX,
    },
    exportable: false,
  },
};

const SAME_SRP_ACCOUNTS: InternalAccount[] = [
  createAccount({
    id: 'same-srp-evm',
    address: SAME_SRP_EVM_ADDRESS,
    name: 'Account 1',
  }),
  createAccount({
    id: 'same-srp-evm-2',
    address: SAME_SRP_EVM_ADDRESS_2,
    name: 'Account 2',
  }),
  createAccount({
    id: 'same-srp-solana',
    address: SAME_SRP_SOLANA_ADDRESS,
    type: 'solana:data-account',
    scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    name: 'Solana 1',
  }),
  // The Money Account itself can be present in the group but must never be a
  // selectable recipient.
  createAccount({
    id: 'money-account',
    address: MONEY_ACCOUNT_ADDRESS,
    name: 'Money Account',
  }),
];

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);

interface SetupOptions {
  /** `undefined` is a meaningful value (no Money Account), so presence is checked. */
  primaryMoneyAccount?: never;
  accountsByGroupId?: Record<string, InternalAccount[]>;
}

function setup(options: SetupOptions = {}) {
  const primaryMoneyAccount =
    'primaryMoneyAccount' in options
      ? options.primaryMoneyAccount
      : (MONEY_ACCOUNT as never);
  const accountsByGroupId = options.accountsByGroupId ?? {
    [EXPECTED_GROUP_ID]: SAME_SRP_ACCOUNTS,
  };

  mockUseMoneyAccountInfo.mockReturnValue({
    isMoneyAccountFeatureEnabled: true,
    hasMoneyAccount: Boolean(primaryMoneyAccount),
    primaryMoneyAccount,
  });

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectInternalAccountsByGroupId) {
      return (groupId: string) => accountsByGroupId[groupId] ?? [];
    }
    return undefined;
  });
}

describe('useMusdRescueRecipients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('returns only EVM accounts from the Money Account SRP group', () => {
    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual([
      {
        id: 'same-srp-evm',
        address: SAME_SRP_EVM_ADDRESS,
        name: 'Account 1',
      },
      {
        id: 'same-srp-evm-2',
        address: SAME_SRP_EVM_ADDRESS_2,
        name: 'Account 2',
      },
    ]);
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

  it('resolves accounts from the Money Account multichain group id', () => {
    renderHook(() => useMusdRescueRecipients());

    const selectorResult = mockUseSelector.mock.results.find(
      (entry) => typeof entry.value === 'function',
    )?.value as (groupId: string) => InternalAccount[];

    expect(selectorResult(EXPECTED_GROUP_ID)).toBe(SAME_SRP_ACCOUNTS);
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

  it('returns an empty list when the group has no other accounts', () => {
    setup({ accountsByGroupId: {} });

    const { result } = renderHook(() => useMusdRescueRecipients());

    expect(result.current.recipients).toEqual([]);
  });
});
