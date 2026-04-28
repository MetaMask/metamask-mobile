import { renderHook, act } from '@testing-library/react-native';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import {
  useAllSportsExploreSectionData,
  type ExploreKeyedMarketsSectionPayload,
} from './predictions.sections';

jest.mock('../../../UI/Predict/hooks/usePredictMarketData');
// `strings()` is fine to use unmocked, but i18n init may pull translation files;
// mock to keep this test self-contained.
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUsePredictMarketData = usePredictMarketData as jest.MockedFunction<
  typeof usePredictMarketData
>;

describe('useAllSportsExploreSectionData', () => {
  // Three independent refetch mocks so we can assert which were invoked.
  let refetchBasketball: jest.Mock;
  let refetchFootball: jest.Mock;
  let refetchSoccer: jest.Mock;

  beforeEach(() => {
    refetchBasketball = jest.fn().mockResolvedValue(undefined);
    refetchFootball = jest.fn().mockResolvedValue(undefined);
    refetchSoccer = jest.fn().mockResolvedValue(undefined);

    // Return a different `refetch` for each sport based on the tag_id query param.
    mockUsePredictMarketData.mockImplementation((opts) => {
      const params = (opts as { customQueryParams: string }).customQueryParams;
      const refetchByTag: Record<string, jest.Mock> = {
        'tag_id=28': refetchBasketball,
        'tag_id=10': refetchFootball,
        'tag_id=100350': refetchSoccer,
      };
      return {
        marketData: [],
        isFetching: false,
        hasMore: false,
        isFetchingMore: false,
        fetchMore: jest.fn(),
        refetch: refetchByTag[params],
      } as unknown as ReturnType<typeof usePredictMarketData>;
    });
  });

  afterEach(() => {
    mockUsePredictMarketData.mockReset();
  });

  it('starts with basketball active and only basketball enabled', () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());
    const payload = result.current.data[0] as ExploreKeyedMarketsSectionPayload;

    expect(payload.activeKey).toBe('basketball');
    expect(payload.pills.map((p) => p.key)).toEqual([
      'basketball',
      'football',
      'soccer',
    ]);

    // Only basketball should have been called with enabled=true.
    const calls = mockUsePredictMarketData.mock.calls.map(
      (c) => c[0] as { customQueryParams: string; enabled: boolean },
    );
    const enabledByTag = Object.fromEntries(
      calls.map((c) => [c.customQueryParams, c.enabled]),
    );
    expect(enabledByTag).toEqual({
      'tag_id=28': true, // basketball
      'tag_id=10': false, // football
      'tag_id=100350': false, // soccer
    });
  });

  it('keeps previously loaded sports enabled when switching active sport', () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());

    act(() => {
      const payload = result.current
        .data[0] as ExploreKeyedMarketsSectionPayload;
      payload.selectSport('football');
    });

    const payload = result.current.data[0] as ExploreKeyedMarketsSectionPayload;
    expect(payload.activeKey).toBe('football');

    // Latest render: basketball stays loaded, football is now loaded, soccer still off.
    const lastCalls = mockUsePredictMarketData.mock.calls
      .slice(-3)
      .map((c) => c[0] as { customQueryParams: string; enabled: boolean });
    const lastByTag = Object.fromEntries(
      lastCalls.map((c) => [c.customQueryParams, c.enabled]),
    );
    expect(lastByTag).toEqual({
      'tag_id=28': true,
      'tag_id=10': true,
      'tag_id=100350': false,
    });
  });

  it('refetches only sports that have been loaded', async () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());

    // Load football, leave soccer untouched.
    act(() => {
      const payload = result.current
        .data[0] as ExploreKeyedMarketsSectionPayload;
      payload.selectSport('football');
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(refetchBasketball).toHaveBeenCalledTimes(1);
    expect(refetchFootball).toHaveBeenCalledTimes(1);
    expect(refetchSoccer).not.toHaveBeenCalled();
  });

  it('exposes a stable payload shape consumed by AllSportsPillSection', () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());
    const payload = result.current.data[0] as ExploreKeyedMarketsSectionPayload;

    expect(payload).toEqual(
      expect.objectContaining({
        pills: expect.any(Array),
        marketsByKey: expect.objectContaining({
          basketball: expect.any(Object),
          football: expect.any(Object),
          soccer: expect.any(Object),
        }),
        activeKey: expect.any(String),
        selectSport: expect.any(Function),
      }),
    );
  });
});
