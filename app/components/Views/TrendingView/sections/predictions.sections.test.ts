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

const MIN_OVERRIDE = '&volume_min=0&liquidity_min=0';

describe('useAllSportsExploreSectionData', () => {
  // Independent refetch mocks so we can assert which were invoked.
  let refetchSoccer: jest.Mock;
  let refetchBasketball: jest.Mock;
  let refetchTennis: jest.Mock;
  let refetchF1: jest.Mock;
  let refetchGolf: jest.Mock;

  beforeEach(() => {
    refetchSoccer = jest.fn().mockResolvedValue(undefined);
    refetchBasketball = jest.fn().mockResolvedValue(undefined);
    refetchTennis = jest.fn().mockResolvedValue(undefined);
    refetchF1 = jest.fn().mockResolvedValue(undefined);
    refetchGolf = jest.fn().mockResolvedValue(undefined);

    // Return a different `refetch` for each sport based on the tag_id query param.
    mockUsePredictMarketData.mockImplementation((opts) => {
      const params = (opts as { customQueryParams: string }).customQueryParams;
      const refetchByTag: Record<string, jest.Mock> = {
        [`tag_id=100350${MIN_OVERRIDE}`]: refetchSoccer,
        [`tag_id=28${MIN_OVERRIDE}`]: refetchBasketball,
        [`tag_id=864${MIN_OVERRIDE}`]: refetchTennis,
        [`tag_id=435${MIN_OVERRIDE}`]: refetchF1,
        [`tag_id=100219${MIN_OVERRIDE}`]: refetchGolf,
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

  it('starts with soccer active and only soccer enabled', () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());
    const payload = result.current.data[0] as ExploreKeyedMarketsSectionPayload;

    expect(payload.activeKey).toBe('soccer');
    expect(payload.pills.map((p) => p.key)).toEqual([
      'soccer',
      'basketball',
      'tennis',
      'f1',
      'golf',
    ]);

    // Only soccer should have been called with enabled=true.
    const calls = mockUsePredictMarketData.mock.calls.map(
      (c) => c[0] as { customQueryParams: string; enabled: boolean },
    );
    const enabledByTag = Object.fromEntries(
      calls.map((c) => [c.customQueryParams, c.enabled]),
    );
    expect(enabledByTag).toEqual({
      [`tag_id=100350${MIN_OVERRIDE}`]: true, // soccer
      [`tag_id=28${MIN_OVERRIDE}`]: false, // basketball
      [`tag_id=864${MIN_OVERRIDE}`]: false, // tennis
      [`tag_id=435${MIN_OVERRIDE}`]: false, // f1
      [`tag_id=100219${MIN_OVERRIDE}`]: false, // golf
    });
  });

  it('keeps previously loaded sports enabled when switching active sport', () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());

    act(() => {
      const payload = result.current
        .data[0] as ExploreKeyedMarketsSectionPayload;
      payload.selectSport('basketball');
    });

    const payload = result.current.data[0] as ExploreKeyedMarketsSectionPayload;
    expect(payload.activeKey).toBe('basketball');

    // Latest render: soccer stays loaded, basketball is now loaded, others still off.
    const lastCalls = mockUsePredictMarketData.mock.calls
      .slice(-5)
      .map((c) => c[0] as { customQueryParams: string; enabled: boolean });
    const lastByTag = Object.fromEntries(
      lastCalls.map((c) => [c.customQueryParams, c.enabled]),
    );
    expect(lastByTag).toEqual({
      [`tag_id=100350${MIN_OVERRIDE}`]: true,
      [`tag_id=28${MIN_OVERRIDE}`]: true,
      [`tag_id=864${MIN_OVERRIDE}`]: false,
      [`tag_id=435${MIN_OVERRIDE}`]: false,
      [`tag_id=100219${MIN_OVERRIDE}`]: false,
    });
  });

  it('refetches only sports that have been loaded', async () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());

    // Load basketball, leave tennis / f1 / golf untouched.
    act(() => {
      const payload = result.current
        .data[0] as ExploreKeyedMarketsSectionPayload;
      payload.selectSport('basketball');
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(refetchSoccer).toHaveBeenCalledTimes(1);
    expect(refetchBasketball).toHaveBeenCalledTimes(1);
    expect(refetchTennis).not.toHaveBeenCalled();
    expect(refetchF1).not.toHaveBeenCalled();
    expect(refetchGolf).not.toHaveBeenCalled();
  });

  it('exposes a stable payload shape consumed by AllSportsPillSection', () => {
    const { result } = renderHook(() => useAllSportsExploreSectionData());
    const payload = result.current.data[0] as ExploreKeyedMarketsSectionPayload;

    expect(payload).toEqual(
      expect.objectContaining({
        pills: expect.any(Array),
        marketsByKey: expect.objectContaining({
          soccer: expect.any(Object),
          basketball: expect.any(Object),
          tennis: expect.any(Object),
          f1: expect.any(Object),
          golf: expect.any(Object),
        }),
        activeKey: expect.any(String),
        selectSport: expect.any(Function),
      }),
    );
  });
});
