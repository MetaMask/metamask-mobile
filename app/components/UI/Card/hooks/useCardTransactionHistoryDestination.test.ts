import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import { selectCardFundingTokens } from '../../../../selectors/cardController';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { FundingStatus } from '../types';
import { useCardCapabilities } from './useCardCapabilities';
import { useCardHomeData } from './useCardHomeData';
import { useCardTransactionHistoryDestination } from './useCardTransactionHistoryDestination';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useCardCapabilities', () => ({
  useCardCapabilities: jest.fn(),
}));

jest.mock('./useCardHomeData', () => ({
  useCardHomeData: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseCardCapabilities = jest.mocked(useCardCapabilities);
const mockUseCardHomeData = jest.mocked(useCardHomeData);

const POST_LAUNCH = '2026-06-01T00:00:00.000Z';
const PRE_LAUNCH = '2026-03-01T00:00:00.000Z';

function setup({
  historyEnabled = true,
  supportsTransactionHistory = true,
  moneyVisible = true,
  createdAt = PRE_LAUNCH as string | null,
  fundingTokens = [] as {
    fundingStatus: FundingStatus;
    isMoneyAccountEntry?: boolean;
  }[],
}: {
  historyEnabled?: boolean;
  supportsTransactionHistory?: boolean;
  moneyVisible?: boolean;
  createdAt?: string | null;
  fundingTokens?: {
    fundingStatus: FundingStatus;
    isMoneyAccountEntry?: boolean;
  }[];
} = {}) {
  mockUseCardCapabilities.mockReturnValue({
    supportsTransactionHistory,
  } as never);

  mockUseCardHomeData.mockReturnValue({
    data: {
      account: { createdAt },
    },
  } as never);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCardTransactionHistoryEnabled) {
      return historyEnabled;
    }
    if (selector === selectIsMoneyAccountVisible) {
      return moneyVisible;
    }
    if (selector === selectCardFundingTokens) {
      return fundingTokens;
    }
    return undefined;
  });
}

describe('useCardTransactionHistoryDestination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the feature flag is disabled', () => {
    setup({ historyEnabled: false });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBeNull();
  });

  it('returns null when the provider has no transaction history and Money is not the destination', () => {
    setup({
      supportsTransactionHistory: false,
      createdAt: PRE_LAUNCH,
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBeNull();
  });

  it('returns card for a pre-launch account', () => {
    setup({
      createdAt: PRE_LAUNCH,
      fundingTokens: [
        {
          fundingStatus: FundingStatus.Enabled,
          isMoneyAccountEntry: true,
        },
      ],
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('card');
  });

  it('returns money when post-launch and only Money Account is delegated', () => {
    setup({
      createdAt: POST_LAUNCH,
      fundingTokens: [
        {
          fundingStatus: FundingStatus.Enabled,
          isMoneyAccountEntry: true,
        },
      ],
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('money');
  });

  it('returns card when post-launch and a non-Money token is also delegated', () => {
    setup({
      createdAt: POST_LAUNCH,
      fundingTokens: [
        {
          fundingStatus: FundingStatus.Enabled,
          isMoneyAccountEntry: true,
        },
        {
          fundingStatus: FundingStatus.Enabled,
          isMoneyAccountEntry: false,
        },
      ],
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('card');
  });

  it('returns card when post-launch with zero delegated tokens', () => {
    setup({
      createdAt: POST_LAUNCH,
      fundingTokens: [
        {
          fundingStatus: FundingStatus.NotEnabled,
          isMoneyAccountEntry: true,
        },
      ],
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('card');
  });

  it('returns card when createdAt is missing', () => {
    setup({ createdAt: null });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('card');
  });

  it('returns card when createdAt is unparseable', () => {
    setup({ createdAt: 'not-a-date' });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('card');
  });

  it('falls back to card when Money is not visible for an otherwise Money destination', () => {
    setup({
      createdAt: POST_LAUNCH,
      moneyVisible: false,
      fundingTokens: [
        {
          fundingStatus: FundingStatus.Enabled,
          isMoneyAccountEntry: true,
        },
      ],
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('card');
  });

  it('returns money even when the provider does not support transaction history', () => {
    setup({
      createdAt: POST_LAUNCH,
      supportsTransactionHistory: false,
      fundingTokens: [
        {
          fundingStatus: FundingStatus.Enabled,
          isMoneyAccountEntry: true,
        },
      ],
    });

    const { result } = renderHook(() => useCardTransactionHistoryDestination());

    expect(result.current).toBe('money');
  });
});
