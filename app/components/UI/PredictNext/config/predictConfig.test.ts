import { DEFAULT_PREDICT_CONFIG, parsePredictConfig } from './predictConfig';

describe('parsePredictConfig', () => {
  it('parses a complete config and removes unknown fields', () => {
    const value = {
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true, ignored: 'value' },
      },
      venueSelection: { enabled: true },
      ignored: 'value',
    };

    const result = parsePredictConfig(value);

    expect(result).toEqual({
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true },
      },
      venueSelection: { enabled: true },
    });
  });

  it.each([undefined, {}, { enabled: true }, { enabled: 'true' }])(
    'returns the safe config for an unusable value',
    (value) => {
      const result = parsePredictConfig(value);

      expect(result).toEqual(DEFAULT_PREDICT_CONFIG);
    },
  );
});
