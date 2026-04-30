import reducer, {
  type AttributionState,
  ATTRIBUTION_DEFAULT_TTL_MS,
  saveAttribution,
  clearAttribution,
  expireAttributionIfStale,
} from './attribution';

const emptyState: AttributionState = { attribution: null };

describe('attribution slice', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeAll(() => {
    dateNowSpy = jest.spyOn(Date, 'now');
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  describe('saveAttribution', () => {
    it('writes acquisition fields and capturedAt from Date.now()', () => {
      dateNowSpy.mockReturnValue(5_000);

      const next = reducer(
        emptyState,
        saveAttribution({
          utm_source: 'email',
          utm_campaign: 'spring',
          attribution_id: 'aid-1',
        }),
      );

      expect(next.attribution).toEqual({
        utm_source: 'email',
        utm_campaign: 'spring',
        attribution_id: 'aid-1',
        capturedAt: 5_000,
      });
    });

    it('overwrites an existing attribution record on a later save', () => {
      dateNowSpy.mockReturnValue(100);
      const withFirst = reducer(
        emptyState,
        saveAttribution({ utm_source: 'first' }),
      );

      dateNowSpy.mockReturnValue(200);
      const next = reducer(
        withFirst,
        saveAttribution({ utm_source: 'second', utm_medium: 'cpc' }),
      );

      expect(next.attribution).toEqual({
        utm_source: 'second',
        utm_medium: 'cpc',
        capturedAt: 200,
      });
    });

    it('leaves state unchanged when every payload field is empty after trim', () => {
      const state = reducer(
        emptyState,
        saveAttribution({
          utm_source: '   ',
          utm_medium: '',
          attribution_id: undefined,
        }),
      );

      expect(state).toEqual(emptyState);
    });

    it('persists when only attribution_id is present', () => {
      dateNowSpy.mockReturnValue(9);

      const next = reducer(
        emptyState,
        saveAttribution({ attribution_id: 'only-id' }),
      );

      expect(next.attribution).toEqual({
        attribution_id: 'only-id',
        capturedAt: 9,
      });
    });

    it('keeps capturedAt when save payload matches existing acquisition fields', () => {
      dateNowSpy.mockReturnValue(1_000);
      const withFirst = reducer(
        emptyState,
        saveAttribution({
          utm_source: 'email',
          utm_campaign: 'spring',
        }),
      );

      dateNowSpy.mockReturnValue(9_000);
      const next = reducer(
        withFirst,
        saveAttribution({
          utm_source: 'email',
          utm_campaign: 'spring',
        }),
      );

      expect(next.attribution?.capturedAt).toBe(1_000);
    });
  });

  describe('clearAttribution', () => {
    it('sets attribution back to null after a prior save', () => {
      dateNowSpy.mockReturnValue(1);
      const withData = reducer(
        emptyState,
        saveAttribution({ utm_source: 'x' }),
      );

      const next = reducer(withData, clearAttribution());

      expect(next).toEqual(emptyState);
    });
  });

  describe('expireAttributionIfStale', () => {
    it('no-ops when attribution is already null', () => {
      dateNowSpy.mockReturnValue(999_999);

      const next = reducer(emptyState, expireAttributionIfStale());

      expect(next).toEqual(emptyState);
    });

    it('keeps attribution when age is exactly the TTL', () => {
      const capturedAt = 10_000;
      const record = {
        utm_source: 'keep',
        capturedAt,
      };

      dateNowSpy.mockReturnValue(capturedAt + ATTRIBUTION_DEFAULT_TTL_MS);

      const next = reducer({ attribution: record }, expireAttributionIfStale());

      expect(next.attribution).toEqual(record);
    });

    it('drops attribution when age is greater than the TTL', () => {
      const capturedAt = 50;
      dateNowSpy.mockReturnValue(capturedAt + ATTRIBUTION_DEFAULT_TTL_MS + 1);

      const next = reducer(
        {
          attribution: {
            utm_source: 'gone',
            capturedAt,
          },
        },
        expireAttributionIfStale(),
      );

      expect(next).toEqual(emptyState);
    });
  });
});
