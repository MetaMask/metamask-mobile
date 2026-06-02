import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import useMoneyAccountInfo from './useMoneyAccountInfo';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyEnableMoneyAccountFlag } from '../selectors/featureFlags';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: jest.fn(),
  selectMoneyHomeScreenEnabledFlag: jest.fn(),
  selectMoneyActivityMockDataEnabledFlag: jest.fn(),
  selectMoneyHubEnabledFlag: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

const MOCK_ACCOUNT = { address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' };

interface SetupOptions {
  primaryMoneyAccount?: typeof MOCK_ACCOUNT | undefined;
  featureEnabled?: boolean;
}

// Default parameters swallow explicit `undefined`, so check key presence instead.
function setupSelectors(options: SetupOptions = {}) {
  const primaryMoneyAccount =
    'primaryMoneyAccount' in options
      ? options.primaryMoneyAccount
      : MOCK_ACCOUNT;
  const featureEnabled = options.featureEnabled ?? true;

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) return primaryMoneyAccount;
    if (selector === selectMoneyEnableMoneyAccountFlag) return featureEnabled;
    return undefined;
  });
}

describe('useMoneyAccountInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
  });

  it('returns isMoneyAccountFeatureEnabled true when flag selector returns true', () => {
    setupSelectors({ featureEnabled: true });

    const { result } = renderHook(() => useMoneyAccountInfo());

    expect(result.current.isMoneyAccountFeatureEnabled).toBe(true);
  });

  it('returns isMoneyAccountFeatureEnabled false when flag selector returns false', () => {
    setupSelectors({ featureEnabled: false });

    const { result } = renderHook(() => useMoneyAccountInfo());

    expect(result.current.isMoneyAccountFeatureEnabled).toBe(false);
  });

  it('returns hasMoneyAccount true when primaryMoneyAccount is defined', () => {
    setupSelectors({ primaryMoneyAccount: MOCK_ACCOUNT });

    const { result } = renderHook(() => useMoneyAccountInfo());

    expect(result.current.hasMoneyAccount).toBe(true);
  });

  it('returns hasMoneyAccount false when primaryMoneyAccount is undefined', () => {
    setupSelectors({ primaryMoneyAccount: undefined });

    const { result } = renderHook(() => useMoneyAccountInfo());

    expect(result.current.hasMoneyAccount).toBe(false);
  });

  it('returns the primaryMoneyAccount object when an account exists', () => {
    setupSelectors({ primaryMoneyAccount: MOCK_ACCOUNT });

    const { result } = renderHook(() => useMoneyAccountInfo());

    expect(result.current.primaryMoneyAccount).toEqual(MOCK_ACCOUNT);
  });

  it('returns undefined primaryMoneyAccount when no account exists', () => {
    setupSelectors({ primaryMoneyAccount: undefined });

    const { result } = renderHook(() => useMoneyAccountInfo());

    expect(result.current.primaryMoneyAccount).toBeUndefined();
  });
});
