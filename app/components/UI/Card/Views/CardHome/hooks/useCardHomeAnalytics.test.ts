import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useCardHomeAnalytics } from './useCardHomeAnalytics';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<
  typeof useAnalytics
>;

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const mockData: CardHomeData = {
  primaryFundingAsset: {
    address: '0xtoken',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    walletAddress: '0xwallet',
    chainId: 'eip155:59144' as `eip155:${number}`,
    spendableBalance: '100',
    spendingCap: '100',
    priority: 1,
    status: 'active' as never,
  },
  fundingAssets: [],
  availableFundingAssets: [],
  card: null,
  account: null,
  alerts: [],
  actions: [],
  delegationSettings: null,
};

function setupHook(
  params: Partial<Parameters<typeof useCardHomeAnalytics>[0]> & {
    isAuthenticated?: boolean;
  } = {},
) {
  const { isAuthenticated = true, ...hookParams } = params;
  mockUseSelector.mockReturnValue(isAuthenticated);
  mockCreateEventBuilder.mockReturnValue({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  });
  mockUseAnalytics.mockReturnValue({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  } as never);

  const mergedData = hookParams.data ?? mockData;
  const hasSetupActions =
    hookParams.hasSetupActions ??
    (mergedData?.actions ?? []).some((a) => a.type === 'enable_card');

  return renderHook(() =>
    useCardHomeAnalytics({
      data: mergedData,
      isLoading: false,
      hasSetupActions,
      balanceFormatted: '$10.00',
      rawTokenBalance: 10,
      rawFiatNumber: 10,
      ...hookParams,
    }),
  );
}

describe('useCardHomeAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not track while isLoading is true', () => {
    setupHook({ isLoading: true });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks once when data is loaded and balance is available', () => {
    setupHook();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not track twice on re-render (hasTracked.current guard)', () => {
    const { rerender } = setupHook();
    rerender();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it("sets state to 'UNAUTHENTICATED' when not authenticated", () => {
    setupHook({ isAuthenticated: false });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'UNAUTHENTICATED' }),
    );
  });

  it("sets state to 'PENDING' when authenticated and kyc_pending alert exists", () => {
    setupHook({
      data: {
        ...mockData,
        alerts: [{ type: 'kyc_pending', dismissable: false }],
      },
    });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'PENDING' }),
    );
  });

  it("sets state to 'PROVISIONING_CARD' when authenticated and card_provisioning alert exists", () => {
    setupHook({
      data: {
        ...mockData,
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      },
    });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'PROVISIONING_CARD' }),
    );
  });

  it("sets state to 'ENABLE_CARD' when authenticated and enable_card action exists", () => {
    setupHook({
      data: {
        ...mockData,
        actions: [{ type: 'enable_card' }],
      },
    });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'ENABLE_CARD' }),
    );
  });

  it("sets state to 'UNFUNDED' when authenticated with zero balance", () => {
    setupHook({ rawTokenBalance: 0 });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'UNFUNDED' }),
    );
  });

  it("sets state to 'UNFUNDED' when authenticated with undefined balance", () => {
    setupHook({ rawTokenBalance: undefined });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'UNFUNDED' }),
    );
  });

  it("sets state to 'VERIFIED' when authenticated with positive balance", () => {
    setupHook({ rawTokenBalance: 10 });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'VERIFIED' }),
    );
  });

  it('converts NaN rawTokenBalance to 0 in the event payload', () => {
    setupHook({ rawTokenBalance: NaN });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ token_raw_balance_priority: 0 }),
    );
  });

  it('converts NaN rawFiatNumber to 0 in the event payload', () => {
    setupHook({ rawFiatNumber: NaN });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ token_fiat_balance_priority: 0 }),
    );
  });

  it('sets token balance fields to undefined when there is no primaryFundingAsset', () => {
    setupHook({
      data: { ...mockData, primaryFundingAsset: null },
      balanceFormatted: undefined,
      rawTokenBalance: undefined,
      rawFiatNumber: undefined,
    });
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: undefined,
        token_fiat_balance_priority: undefined,
      }),
    );
  });

  it('does not track when balanceFormatted is the loading sentinel string', () => {
    // When primaryAsset is present but balance is still loading, isLoaded is false
    setupHook({ balanceFormatted: 'tokenBalanceLoading' });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
