import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import {
  MAX_CONSECUTIVE_POST_UNLOCK_RESUMES,
  clearPostUnlockResume,
  consumePostUnlockResume,
  setPostUnlockResume,
} from './PostUnlockResume';

let mockKeyrings: { type: string; metadata?: { id: string } }[];

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        get state() {
          return { keyrings: mockKeyrings };
        },
      },
    },
  },
}));

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

const REQUEST_KEY = '@MetaMask:postUnlockResume:v1';
const COUNT_KEY = '@MetaMask:postUnlockResumeCount:v1';
const NOW = 1_800_000_000_000;
const MAX_AGE_MS = 120_000;
const OWNER = 'feature-a';
const STATE = { index: 0, routes: [{ name: 'SomeScreen' }] };

const mockStorage = jest.mocked(StorageWrapper);
let mockStore: Record<string, string>;

const previousRuntimeRequest = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    owner: OWNER,
    state: STATE,
    maxAgeMs: MAX_AGE_MS,
    keyringId: 'keyring-1',
    runtimeId: 'previous-runtime',
    updatedAt: NOW - 30_000,
    ...overrides,
  });

const readJson = (key: string) =>
  mockStore[key] === undefined ? undefined : JSON.parse(mockStore[key]);

describe('PostUnlockResume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    mockStore = {};
    mockKeyrings = [
      { type: 'Simple Key Pair', metadata: { id: 'imported' } },
      { type: ExtendedKeyringTypes.hd, metadata: { id: 'keyring-1' } },
    ];
    mockStorage.getItem.mockImplementation(async (key: string) =>
      key in mockStore ? mockStore[key] : null,
    );
    mockStorage.setItem.mockImplementation(
      async (key: string, value: string) => {
        mockStore[key] = value;
      },
    );
    mockStorage.removeItem.mockImplementation(async (key: string) => {
      delete mockStore[key];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setPostUnlockResume', () => {
    it('stores the request with the primary SRP keyring and the current time', async () => {
      await setPostUnlockResume({
        owner: OWNER,
        state: STATE,
        maxAgeMs: MAX_AGE_MS,
      });

      expect(readJson(REQUEST_KEY)).toStrictEqual({
        owner: OWNER,
        state: STATE,
        maxAgeMs: MAX_AGE_MS,
        keyringId: 'keyring-1',
        runtimeId: expect.any(String),
        updatedAt: NOW,
      });
    });

    it('skips the write while no SRP keyring is unlocked', async () => {
      mockKeyrings = [];

      await setPostUnlockResume({
        owner: OWNER,
        state: STATE,
        maxAgeMs: MAX_AGE_MS,
      });

      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('logs instead of throwing when storage fails', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('disk full'));

      await expect(
        setPostUnlockResume({ owner: OWNER, state: STATE, maxAgeMs: 1 }),
      ).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('clearPostUnlockResume', () => {
    it('removes the owner request and resume count', async () => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest();
      mockStore[COUNT_KEY] = JSON.stringify({
        owner: OWNER,
        count: 2,
        lastAt: NOW,
      });

      await clearPostUnlockResume(OWNER);

      expect(mockStore).toStrictEqual({});
    });

    it('leaves another owner request in place', async () => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest({ owner: 'feature-b' });

      await clearPostUnlockResume(OWNER);

      expect(mockStore[REQUEST_KEY]).toBeDefined();
    });
  });

  describe('consumePostUnlockResume', () => {
    it('returns nothing when no request exists', async () => {
      await expect(consumePostUnlockResume()).resolves.toBeUndefined();
      expect(mockStorage.removeItem).not.toHaveBeenCalled();
    });

    it('returns the state of a recent request from a previous runtime', async () => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest();

      await expect(consumePostUnlockResume()).resolves.toStrictEqual(STATE);
      expect(mockStore[REQUEST_KEY]).toBeUndefined();
      expect(readJson(COUNT_KEY)).toStrictEqual({
        owner: OWNER,
        count: 1,
        lastAt: NOW,
      });
    });

    it('resumes at the edge of the max age', async () => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest({
        updatedAt: NOW - MAX_AGE_MS,
      });

      await expect(consumePostUnlockResume()).resolves.toStrictEqual(STATE);
    });

    it.each([
      ['older than its max age', { updatedAt: NOW - MAX_AGE_MS - 1 }],
      ['stamped in the future', { updatedAt: NOW + 1 }],
      ['for another SRP', { keyringId: 'keyring-2' }],
      ['without navigation state', { state: { index: 0 } }],
    ])('deletes a request %s without resuming', async (_label, overrides) => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest(overrides);

      await expect(consumePostUnlockResume()).resolves.toBeUndefined();
      expect(mockStore[REQUEST_KEY]).toBeUndefined();
      expect(mockStore[COUNT_KEY]).toBeUndefined();
    });

    it('deletes a malformed request without resuming', async () => {
      mockStore[REQUEST_KEY] = 'not-json';

      await expect(consumePostUnlockResume()).resolves.toBeUndefined();
      expect(mockStore[REQUEST_KEY]).toBeUndefined();
    });

    it('leaves a request from the current runtime in place', async () => {
      await setPostUnlockResume({
        owner: OWNER,
        state: STATE,
        maxAgeMs: MAX_AGE_MS,
      });

      await expect(consumePostUnlockResume()).resolves.toBeUndefined();
      expect(mockStore[REQUEST_KEY]).toBeDefined();
    });

    it('allows another resume in a row below the cap', async () => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest();
      mockStore[COUNT_KEY] = JSON.stringify({
        owner: OWNER,
        count: MAX_CONSECUTIVE_POST_UNLOCK_RESUMES - 1,
        lastAt: NOW - 60_000,
      });

      await expect(consumePostUnlockResume()).resolves.toStrictEqual(STATE);
      expect(readJson(COUNT_KEY)).toStrictEqual({
        owner: OWNER,
        count: MAX_CONSECUTIVE_POST_UNLOCK_RESUMES,
        lastAt: NOW,
      });
    });

    it('goes home once the resumes in a row reach the cap', async () => {
      const count = JSON.stringify({
        owner: OWNER,
        count: MAX_CONSECUTIVE_POST_UNLOCK_RESUMES,
        lastAt: NOW - 10_000,
      });
      mockStore[REQUEST_KEY] = previousRuntimeRequest();
      mockStore[COUNT_KEY] = count;

      await expect(consumePostUnlockResume()).resolves.toBeUndefined();
      expect(mockStore[REQUEST_KEY]).toBeUndefined();
      expect(mockStore[COUNT_KEY]).toBe(count);
    });

    it.each([
      [
        'once the last resume is older than the max age',
        { owner: OWNER, lastAt: NOW - MAX_AGE_MS - 1 },
      ],
      ['for another owner', { owner: 'feature-b', lastAt: NOW - 10_000 }],
    ])('starts counting again %s', async (_label, stored) => {
      mockStore[REQUEST_KEY] = previousRuntimeRequest();
      mockStore[COUNT_KEY] = JSON.stringify({
        ...stored,
        count: MAX_CONSECUTIVE_POST_UNLOCK_RESUMES,
      });

      await expect(consumePostUnlockResume()).resolves.toStrictEqual(STATE);
      expect(readJson(COUNT_KEY)).toStrictEqual({
        owner: OWNER,
        count: 1,
        lastAt: NOW,
      });
    });

    it('logs and skips the resume when storage fails', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('read failed'));

      await expect(consumePostUnlockResume()).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
