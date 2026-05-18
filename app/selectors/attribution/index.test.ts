import type { RootState } from '../../reducers';
import { selectAttributionRecord } from './index';

describe('attribution selectors', () => {
  it('returns nested attribution record from root state', () => {
    const state = {
      attribution: {
        attribution: {
          utm_source: 'email',
          capturedAt: 42,
        },
        _persist: { version: 0, rehydrated: true },
      },
    } as unknown as RootState;

    expect(selectAttributionRecord(state)).toEqual({
      utm_source: 'email',
      capturedAt: 42,
    });
  });

  it('returns null when slice has no attribution record', () => {
    const state = {
      attribution: {
        attribution: null,
        _persist: { version: 0, rehydrated: true },
      },
    } as unknown as RootState;

    expect(selectAttributionRecord(state)).toBeNull();
  });
});
