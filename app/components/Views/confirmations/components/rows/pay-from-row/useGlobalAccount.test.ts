import { renderHook } from '@testing-library/react-hooks';
import { AvatarAccountVariant } from '@metamask/design-system-react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectInternalAccountsById: jest.fn(),
}));

jest.mock(
  '../../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(),
  }),
);

jest.mock('../../../../../../selectors/settings', () => ({
  selectAvatarAccountType: jest.fn(),
}));

// selectBalanceBySelectedAccountGroup returns a selector factory — the module
// captures the result of one call at init time, so the mock must stay stable.
jest.mock('../../../../../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(
    (
      amount: number,
      _threshold: number,
      _locale: string,
      options: { currency: string },
    ) => `${options.currency} ${amount.toFixed(2)}`,
  ),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

import { useSelector } from 'react-redux';
import {
  selectSelectedInternalAccount,
  selectInternalAccountsById,
} from '../../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { useGlobalAccount } from './useGlobalAccount';

const mockUseSelector = jest.mocked(useSelector);

const ADDRESS_MOCK = '0xabc123';
const ACCOUNT_ID = 'account-id-1';

const MOCK_ACCOUNT = {
  id: ACCOUNT_ID,
  address: ADDRESS_MOCK,
  metadata: { name: 'Fallback Name' },
};

const MOCK_ACCOUNTS_BY_ID = {
  [ACCOUNT_ID]: MOCK_ACCOUNT,
};

const MOCK_GROUP = {
  id: 'group-1',
  metadata: { name: 'Group Account Name' },
};

function setupSelectors({
  selectedAccount = MOCK_ACCOUNT as typeof MOCK_ACCOUNT | null,
  accountsById = MOCK_ACCOUNTS_BY_ID,
  accountToGroupMap = { [ACCOUNT_ID]: MOCK_GROUP } as Record<
    string,
    typeof MOCK_GROUP
  >,
  avatarType = 'Blockies',
  groupBalance = {
    totalBalanceInUserCurrency: 42.5,
    userCurrency: 'usd',
  } as { totalBalanceInUserCurrency: number; userCurrency: string } | null,
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSelectedInternalAccount) return selectedAccount;
    if (selector === selectInternalAccountsById) return accountsById;
    if (selector === selectAccountToGroupMap) return accountToGroupMap;
    if (selector === selectAvatarAccountType) return avatarType;
    // Catches the module-level selectSelectedAccountBalance selector
    return groupBalance;
  });
}

describe('useGlobalAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns group name when account is in accountToGroupMap', () => {
    setupSelectors();
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.name).toBe('Group Account Name');
  });

  it('falls back to account metadata name when account is not in internalAccountsById', () => {
    // id won't be found → falls back to selectedInternalAccount.metadata.name
    setupSelectors({ accountsById: {} });
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.name).toBe('Fallback Name');
  });

  it('returns empty address when no account is selected', () => {
    setupSelectors({ selectedAccount: null });
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.address).toBe('');
  });

  it('returns the selected account address', () => {
    setupSelectors();
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.address).toBe(ADDRESS_MOCK);
  });

  it.each([
    ['Blockies', AvatarAccountVariant.Blockies],
    ['JazzIcon', AvatarAccountVariant.Jazzicon],
    ['Maskicon', AvatarAccountVariant.Maskicon],
  ])('maps avatarType %s to %s', (type, expected) => {
    setupSelectors({ avatarType: type });
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.avatarVariant).toBe(expected);
  });

  it('defaults to Jazzicon for unknown avatar type', () => {
    setupSelectors({ avatarType: 'Unknown' });
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.avatarVariant).toBe(AvatarAccountVariant.Jazzicon);
  });

  it('returns formatted balance when group balance is available', () => {
    setupSelectors({
      groupBalance: { totalBalanceInUserCurrency: 10.84, userCurrency: 'usd' },
    });
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.formattedBalance).toBe('USD 10.84');
  });

  it('returns undefined balance when group balance is null', () => {
    setupSelectors({ groupBalance: null });
    const { result } = renderHook(() => useGlobalAccount());
    expect(result.current.formattedBalance).toBeUndefined();
  });
});
