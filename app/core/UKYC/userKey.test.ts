import { base64ToBytes, bytesToBase64 } from '@metamask/utils';
import Engine from '../Engine';
import { getRandomBytes } from '../Encryptor/bytes';
import { getOrCreateUserKey, hasUserKey, loadUserKey } from './userKey';
import { UKYC_USER_KEY_PATH, UKYC_USER_KEY_SIZE_BYTES } from './constants';

jest.mock('../Engine', () => ({
  context: {
    UserStorageController: {
      performGetStorage: jest.fn(),
      performSetStorage: jest.fn(),
    },
  },
}));

jest.mock('../Encryptor/bytes', () => ({
  getRandomBytes: jest.fn(),
}));

const mockPerformGetStorage = Engine.context.UserStorageController
  .performGetStorage as jest.Mock;
const mockPerformSetStorage = Engine.context.UserStorageController
  .performSetStorage as jest.Mock;
const mockGetRandomBytes = getRandomBytes as jest.Mock;

const USER_KEY_BYTES = new Uint8Array(UKYC_USER_KEY_SIZE_BYTES).fill(7);
const USER_KEY_BASE64 = bytesToBase64(USER_KEY_BYTES);

describe('UKYC userKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRandomBytes.mockReturnValue(USER_KEY_BYTES);
    mockPerformSetStorage.mockResolvedValue(undefined);
  });

  describe('loadUserKey', () => {
    it('returns null when no user_key is stored', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      const result = await loadUserKey();

      expect(result).toBeNull();
      expect(mockPerformGetStorage).toHaveBeenCalledWith(
        UKYC_USER_KEY_PATH,
        undefined,
      );
    });

    it('decodes and returns the stored user_key', async () => {
      mockPerformGetStorage.mockResolvedValue(USER_KEY_BASE64);

      const result = await loadUserKey();

      expect(result).toEqual(USER_KEY_BYTES);
    });

    it('forwards the entropy source id', async () => {
      mockPerformGetStorage.mockResolvedValue(USER_KEY_BASE64);

      await loadUserKey('entropy-1');

      expect(mockPerformGetStorage).toHaveBeenCalledWith(
        UKYC_USER_KEY_PATH,
        'entropy-1',
      );
    });

    it('throws when the stored user_key has an unexpected length', async () => {
      mockPerformGetStorage.mockResolvedValue(
        bytesToBase64(new Uint8Array(16)),
      );

      await expect(loadUserKey()).rejects.toThrow('unexpected length');
    });

    it('throws when the controller is unavailable', async () => {
      const original = Engine.context.UserStorageController;
      // @ts-expect-error deliberately simulating an uninitialised Engine
      Engine.context.UserStorageController = undefined;

      await expect(loadUserKey()).rejects.toThrow(
        'UserStorageController is not available',
      );

      Engine.context.UserStorageController = original;
    });
  });

  describe('getOrCreateUserKey', () => {
    it('returns the existing user_key without generating a new one', async () => {
      mockPerformGetStorage.mockResolvedValue(USER_KEY_BASE64);

      const result = await getOrCreateUserKey();

      expect(result).toEqual(USER_KEY_BYTES);
      expect(mockGetRandomBytes).not.toHaveBeenCalled();
      expect(mockPerformSetStorage).not.toHaveBeenCalled();
    });

    it('generates and persists a new user_key on first enrollment', async () => {
      mockPerformGetStorage
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(USER_KEY_BASE64);

      const result = await getOrCreateUserKey();

      expect(mockGetRandomBytes).toHaveBeenCalledWith(
        UKYC_USER_KEY_SIZE_BYTES,
      );
      expect(mockPerformSetStorage).toHaveBeenCalledWith(
        UKYC_USER_KEY_PATH,
        USER_KEY_BASE64,
        undefined,
      );
      expect(result).toEqual(USER_KEY_BYTES);
    });

    it('converges on a competing value that won the write race', async () => {
      const competingBytes = new Uint8Array(UKYC_USER_KEY_SIZE_BYTES).fill(9);
      mockPerformGetStorage
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(bytesToBase64(competingBytes));

      const result = await getOrCreateUserKey();

      expect(result).toEqual(competingBytes);
    });

    it('deduplicates concurrent create calls into a single generation', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      const [a, b] = await Promise.all([
        getOrCreateUserKey(),
        getOrCreateUserKey(),
      ]);

      expect(a).toEqual(b);
      expect(mockGetRandomBytes).toHaveBeenCalledTimes(1);
      expect(mockPerformSetStorage).toHaveBeenCalledTimes(1);
    });

    it('falls back to the generated key if the re-read returns nothing', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      const result = await getOrCreateUserKey();

      expect(result).toEqual(USER_KEY_BYTES);
    });
  });

  describe('hasUserKey', () => {
    it('returns true when a user_key exists', async () => {
      mockPerformGetStorage.mockResolvedValue(USER_KEY_BASE64);

      await expect(hasUserKey()).resolves.toBe(true);
    });

    it('returns false when no user_key exists', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      await expect(hasUserKey()).resolves.toBe(false);
    });
  });

  it('round-trips a persisted key back through load', async () => {
    let persisted: string | null = null;
    mockPerformSetStorage.mockImplementation(async (_path, value) => {
      persisted = value;
    });
    mockPerformGetStorage.mockImplementation(async () => persisted);

    await getOrCreateUserKey();
    const loaded = await loadUserKey();

    expect(loaded).toEqual(base64ToBytes(USER_KEY_BASE64));
  });
});
