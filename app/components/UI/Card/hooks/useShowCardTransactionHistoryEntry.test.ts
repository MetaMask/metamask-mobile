import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../Money/selectors/eligibility';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { useCardCapabilities } from './useCardCapabilities';
import { useShowCardTransactionHistoryEntry } from './useShowCardTransactionHistoryEntry';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useCardCapabilities', () => ({
  useCardCapabilities: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseCardCapabilities = jest.mocked(useCardCapabilities);

function setup({
  historyEnabled = true,
  supportsTransactionHistory = true,
  supportsMoneyAccountLinking = false,
  moneyAccountFlag = false,
  geoEligible = false,
  primaryMoneyAccount = undefined as { address: string } | undefined,
}: {
  historyEnabled?: boolean;
  supportsTransactionHistory?: boolean;
  supportsMoneyAccountLinking?: boolean;
  moneyAccountFlag?: boolean;
  geoEligible?: boolean;
  primaryMoneyAccount?: { address: string } | undefined;
} = {}) {
  mockUseCardCapabilities.mockReturnValue({
    supportsTransactionHistory,
    supportsMoneyAccountLinking,
  } as never);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCardTransactionHistoryEnabled) {
      return historyEnabled;
    }
    if (selector === selectMoneyEnableMoneyAccountFlag) {
      return moneyAccountFlag;
    }
    if (selector === selectIsMoneyAccountGeoEligible) {
      return geoEligible;
    }
    if (selector === selectPrimaryMoneyAccount) {
      return primaryMoneyAccount;
    }
    return undefined;
  });
}

describe('useShowCardTransactionHistoryEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when history is enabled and the provider supports it', () => {
    setup();

    const { result } = renderHook(() => useShowCardTransactionHistoryEntry());

    expect(result.current).toBe(true);
  });

  it('returns false when the feature flag is disabled', () => {
    setup({ historyEnabled: false });

    const { result } = renderHook(() => useShowCardTransactionHistoryEntry());

    expect(result.current).toBe(false);
  });

  it('returns false when the provider does not support transaction history', () => {
    setup({ supportsTransactionHistory: false });

    const { result } = renderHook(() => useShowCardTransactionHistoryEntry());

    expect(result.current).toBe(false);
  });

  it('returns false when history lives in the Money feed for linked Money accounts', () => {
    setup({
      supportsMoneyAccountLinking: true,
      moneyAccountFlag: true,
      geoEligible: true,
      primaryMoneyAccount: { address: '0xabc' },
    });

    const { result } = renderHook(() => useShowCardTransactionHistoryEntry());

    expect(result.current).toBe(false);
  });

  it('returns true when Money account linking is supported but the user has no Money account', () => {
    setup({
      supportsMoneyAccountLinking: true,
      moneyAccountFlag: true,
      geoEligible: true,
      primaryMoneyAccount: undefined,
    });

    const { result } = renderHook(() => useShowCardTransactionHistoryEntry());

    expect(result.current).toBe(true);
  });
});
