import StorageWrapper from '../../store/storage-wrapper';
import { CACHE_KEY_PREFIX, CACHE_TTL_MS } from './constants';
import { readStoredQuery, writeStoredQuery } from './persistence';
import { NetworkCache } from './types';

const KEY = ['prices'];
const STORAGE_KEY = `${CACHE_KEY_PREFIX}["prices"]`;
const NOW = 1_000_000;

const parseNumber = (body: unknown): number => {
  if (typeof body !== 'number') throw new Error('not a number');
  return body;
};

function givenStored(value: string | null): void {
  jest.mocked(StorageWrapper.getItemSync).mockReturnValue(value);
}

function envelope(savedAt: number, body: unknown): string {
  return JSON.stringify({ savedAt, body });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(StorageWrapper.setItem).mockResolvedValue(undefined);
  jest.mocked(StorageWrapper.removeItem).mockResolvedValue(undefined);
  givenStored(null);
});

describe('readStoredQuery', () => {
  it('returns the parsed body saved within the short TTL', () => {
    givenStored(envelope(NOW - 1_000, 7));

    expect(readStoredQuery(KEY, NetworkCache.SHORT, parseNumber, NOW)).toEqual({
      data: 7,
      savedAt: NOW - 1_000,
    });
    expect(StorageWrapper.getItemSync).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('keeps an entry past the short TTL for the long cache', () => {
    givenStored(envelope(NOW - CACHE_TTL_MS[NetworkCache.SHORT] - 1, 7));

    expect(
      readStoredQuery(KEY, NetworkCache.LONG, parseNumber, NOW)?.data,
    ).toBe(7);
  });

  it('returns null and does not touch storage when caching is off', () => {
    expect(
      readStoredQuery(KEY, NetworkCache.NONE, parseNumber, NOW),
    ).toBeNull();
    expect(StorageWrapper.getItemSync).not.toHaveBeenCalled();
  });

  it('returns null when nothing is saved', () => {
    expect(
      readStoredQuery(KEY, NetworkCache.SHORT, parseNumber, NOW),
    ).toBeNull();
    expect(StorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it.each([
    ['expired', envelope(NOW - CACHE_TTL_MS[NetworkCache.SHORT], 7)],
    ['saved in the future', envelope(NOW + 1, 7)],
    ['not JSON', '{oops'],
    ['missing its timestamp', JSON.stringify({ body: 7 })],
    ['no longer valid for parse', envelope(NOW - 1_000, 'seven')],
  ])('discards an entry that is %s', (_, raw) => {
    givenStored(raw);

    expect(
      readStoredQuery(KEY, NetworkCache.SHORT, parseNumber, NOW),
    ).toBeNull();
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe('writeStoredQuery', () => {
  it('saves the body with its timestamp', () => {
    writeStoredQuery(KEY, NetworkCache.SHORT, 7, NOW);

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      envelope(NOW, 7),
      { emitEvent: false },
    );
  });

  it('saves nothing when caching is off', () => {
    writeStoredQuery(KEY, NetworkCache.NONE, 7, NOW);

    expect(StorageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('swallows a failed write', async () => {
    jest.mocked(StorageWrapper.setItem).mockRejectedValue(new Error('full'));

    expect(() =>
      writeStoredQuery(KEY, NetworkCache.SHORT, 7, NOW),
    ).not.toThrow();
    await Promise.resolve();
  });
});
