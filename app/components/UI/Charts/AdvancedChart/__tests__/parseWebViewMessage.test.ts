import { parseWebViewMessage } from '../AdvancedChart.types';

describe('parseWebViewMessage', () => {
  it('returns null for non-object input', () => {
    expect(parseWebViewMessage(null)).toBeNull();
    expect(parseWebViewMessage('nope')).toBeNull();
  });

  it('parses CHART_READY', () => {
    expect(parseWebViewMessage({ type: 'CHART_READY' })).toEqual({
      type: 'CHART_READY',
    });
  });

  describe('FETCH_OLDER_BARS_REQUEST', () => {
    const validPayload = {
      requestId: 'req-1',
      seriesGeneration: 3,
      symbol: 'BTC',
      resolution: '60',
      fromSec: 1700000000,
      toSec: 1700003600,
      oldestLoadedTimeMs: 1700000000000,
    };

    it('parses a fully-populated request (regression: getOptionalNumber must exist)', () => {
      const result = parseWebViewMessage({
        type: 'FETCH_OLDER_BARS_REQUEST',
        payload: validPayload,
      });
      expect(result).toEqual({
        type: 'FETCH_OLDER_BARS_REQUEST',
        payload: validPayload,
      });
    });

    it('includes countBack only when it is a finite number', () => {
      const withCountBack = parseWebViewMessage({
        type: 'FETCH_OLDER_BARS_REQUEST',
        payload: { ...validPayload, countBack: 500 },
      });
      expect(withCountBack).toMatchObject({
        payload: { countBack: 500 },
      });
    });

    it('returns null when a required numeric field is missing', () => {
      const { fromSec: _omitted, ...missingFromSec } = validPayload;
      expect(
        parseWebViewMessage({
          type: 'FETCH_OLDER_BARS_REQUEST',
          payload: missingFromSec,
        }),
      ).toBeNull();
    });

    it('returns null when requestId is absent', () => {
      const { requestId: _omitted, ...missingRequestId } = validPayload;
      expect(
        parseWebViewMessage({
          type: 'FETCH_OLDER_BARS_REQUEST',
          payload: missingRequestId,
        }),
      ).toBeNull();
    });
  });
});
