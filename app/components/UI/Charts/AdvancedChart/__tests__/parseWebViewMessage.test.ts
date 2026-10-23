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

  it('parses VISIBLE_CANDLE_COUNT_CHANGED', () => {
    expect(
      parseWebViewMessage({
        type: 'VISIBLE_CANDLE_COUNT_CHANGED',
        payload: { candleCount: 80 },
      }),
    ).toEqual({
      type: 'VISIBLE_CANDLE_COUNT_CHANGED',
      payload: { candleCount: 80 },
    });
  });

  it('parses CHART_INTERACTED zoom with candleCount', () => {
    expect(
      parseWebViewMessage({
        type: 'CHART_INTERACTED',
        payload: { interaction_type: 'zoom', candleCount: 80 },
      }),
    ).toEqual({
      type: 'CHART_INTERACTED',
      payload: { interaction_type: 'zoom', candleCount: 80 },
    });
  });

  it('omits candleCount from CHART_INTERACTED when it is not a finite number', () => {
    expect(
      parseWebViewMessage({
        type: 'CHART_INTERACTED',
        payload: { interaction_type: 'pan', candleCount: 'nope' },
      }),
    ).toEqual({
      type: 'CHART_INTERACTED',
      payload: { interaction_type: 'pan' },
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

  describe('NATIVE_TV_EVENT', () => {
    it('parses a study event with its id and name', () => {
      expect(
        parseWebViewMessage({
          type: 'NATIVE_TV_EVENT',
          payload: {
            source: 'study',
            type: 'create',
            id: 'st1',
            name: 'Accelerator Oscillator',
          },
        }),
      ).toEqual({
        type: 'NATIVE_TV_EVENT',
        payload: {
          source: 'study',
          type: 'create',
          id: 'st1',
          name: 'Accelerator Oscillator',
        },
      });
    });

    it('drops non-string id and name from a drawing event', () => {
      expect(
        parseWebViewMessage({
          type: 'NATIVE_TV_EVENT',
          payload: { source: 'drawing', type: 'remove', id: 7, name: null },
        }),
      ).toEqual({
        type: 'NATIVE_TV_EVENT',
        payload: { source: 'drawing', type: 'remove' },
      });
    });

    it('returns null for an unknown event source', () => {
      expect(
        parseWebViewMessage({
          type: 'NATIVE_TV_EVENT',
          payload: { source: 'context_menu', type: 'place_limit' },
        }),
      ).toBeNull();
    });

    it('returns null when the event type is missing', () => {
      expect(
        parseWebViewMessage({
          type: 'NATIVE_TV_EVENT',
          payload: { source: 'study' },
        }),
      ).toBeNull();
    });
  });

  it('parses a DEBUG breadcrumb message', () => {
    expect(
      parseWebViewMessage({
        type: 'DEBUG',
        payload: { message: 'modular-bootstrap-ready' },
      }),
    ).toEqual({
      type: 'DEBUG',
      payload: { message: 'modular-bootstrap-ready' },
    });
  });

  it('returns null for an INDICATOR_ADDED message without an id', () => {
    expect(
      parseWebViewMessage({
        type: 'INDICATOR_ADDED',
        payload: { name: 'RSI' },
      }),
    ).toBeNull();
  });

  it('returns null for a TRADE_MARKER_PRESSED message with an empty id', () => {
    expect(
      parseWebViewMessage({
        type: 'TRADE_MARKER_PRESSED',
        payload: { id: '' },
      }),
    ).toBeNull();
  });
});
