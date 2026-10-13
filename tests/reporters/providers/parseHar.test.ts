import { parseHarToEntries } from './parseHar';

describe('parseHarToEntries', () => {
  it('maps HAR entries to method, url, status and rounded time', () => {
    const har = {
      log: {
        entries: [
          {
            request: { method: 'POST', url: 'https://api.example.com/a' },
            response: { status: 201 },
            time: 12.6,
          },
        ],
      },
    };

    expect(parseHarToEntries(har)).toEqual([
      {
        method: 'POST',
        url: 'https://api.example.com/a',
        status: 201,
        time: 13,
      },
    ]);
  });

  it('accepts a bare { entries } object and defaults a missing method to GET', () => {
    const result = parseHarToEntries({
      entries: [{ request: { url: 'https://api.example.com/b' } }],
    });

    expect(result).toEqual([
      {
        method: 'GET',
        url: 'https://api.example.com/b',
        status: undefined,
        time: undefined,
      },
    ]);
  });

  it.each([null, undefined, {}, { log: {} }, { log: { entries: 'nope' } }])(
    'returns an empty list for malformed input %p',
    (input) => {
      expect(parseHarToEntries(input)).toEqual([]);
    },
  );
});
