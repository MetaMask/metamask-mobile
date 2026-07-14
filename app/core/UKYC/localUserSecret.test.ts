import { base64ToBytes, bytesToBase64 } from '@metamask/utils';
import Engine from '../Engine';
import { getRandomBytes } from '../Encryptor/bytes';
import {
  getOrCreateLocalUserSecret,
  hasLocalUserSecret,
  loadLocalUserSecret,
} from './localUserSecret';
import {
  UKYC_LOCAL_USER_SECRET_PATH,
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
} from './constants';

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

const LOCAL_USER_SECRET_BYTES = new Uint8Array(
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
).fill(7);
const LOCAL_USER_SECRET_BASE64 = bytesToBase64(LOCAL_USER_SECRET_BYTES);

describe('UKYC localUserSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRandomBytes.mockReturnValue(LOCAL_USER_SECRET_BYTES);
    mockPerformSetStorage.mockResolvedValue(undefined);
  });

  describe('loadLocalUserSecret', () => {
    it('returns null when no local_user_secret is stored', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      const result = await loadLocalUserSecret();

      expect(result).toBeNull();
      expect(mockPerformGetStorage).toHaveBeenCalledWith(
        UKYC_LOCAL_USER_SECRET_PATH,
        undefined,
      );
    });

    it('decodes and returns the stored local_user_secret', async () => {
      mockPerformGetStorage.mockResolvedValue(LOCAL_USER_SECRET_BASE64);

      const result = await loadLocalUserSecret();

      expect(result).toEqual(LOCAL_USER_SECRET_BYTES);
    });

    it('forwards the entropy source id', async () => {
      mockPerformGetStorage.mockResolvedValue(LOCAL_USER_SECRET_BASE64);

      await loadLocalUserSecret('entropy-1');

      expect(mockPerformGetStorage).toHaveBeenCalledWith(
        UKYC_LOCAL_USER_SECRET_PATH,
        'entropy-1',
      );
    });

    it('throws when the stored local_user_secret has an unexpected length', async () => {
      mockPerformGetStorage.mockResolvedValue(
        bytesToBase64(new Uint8Array(16)),
      );

      await expect(loadLocalUserSecret()).rejects.toThrow('unexpected length');
    });

    it('throws when the controller is unavailable', async () => {
      const original = Engine.context.UserStorageController;
      // @ts-expect-error deliberately simulating an uninitialised Engine
      Engine.context.UserStorageController = undefined;

      await expect(loadLocalUserSecret()).rejects.toThrow(
        'UserStorageController is not available',
      );

      Engine.context.UserStorageController = original;
    });
  });

  describe('getOrCreateLocalUserSecret', () => {
    it('returns the existing local_user_secret without generating a new one', async () => {
      mockPerformGetStorage.mockResolvedValue(LOCAL_USER_SECRET_BASE64);

      const result = await getOrCreateLocalUserSecret();

      expect(result).toEqual(LOCAL_USER_SECRET_BYTES);
      expect(mockGetRandomBytes).not.toHaveBeenCalled();
      expect(mockPerformSetStorage).not.toHaveBeenCalled();
    });

    it('generates and persists a new local_user_secret on first enrollment', async () => {
      mockPerformGetStorage
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(LOCAL_USER_SECRET_BASE64);

      const result = await getOrCreateLocalUserSecret();

      expect(mockGetRandomBytes).toHaveBeenCalledWith(
        UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
      );
      expect(mockPerformSetStorage).toHaveBeenCalledWith(
        UKYC_LOCAL_USER_SECRET_PATH,
        LOCAL_USER_SECRET_BASE64,
        undefined,
      );
      expect(result).toEqual(LOCAL_USER_SECRET_BYTES);
    });

    it('converges on a competing value that won the write race', async () => {
      const competingBytes = new Uint8Array(
        UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
      ).fill(9);
      mockPerformGetStorage
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(bytesToBase64(competingBytes));

      const result = await getOrCreateLocalUserSecret();

      expect(result).toEqual(competingBytes);
    });

    it('deduplicates concurrent create calls into a single generation', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      const [a, b] = await Promise.all([
        getOrCreateLocalUserSecret(),
        getOrCreateLocalUserSecret(),
      ]);

      expect(a).toEqual(b);
      expect(mockGetRandomBytes).toHaveBeenCalledTimes(1);
      expect(mockPerformSetStorage).toHaveBeenCalledTimes(1);
    });

    it('falls back to the generated secret if the re-read returns nothing', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      const result = await getOrCreateLocalUserSecret();

      expect(result).toEqual(LOCAL_USER_SECRET_BYTES);
    });
  });

  describe('hasLocalUserSecret', () => {
    it('returns true when a local_user_secret exists', async () => {
      mockPerformGetStorage.mockResolvedValue(LOCAL_USER_SECRET_BASE64);

      await expect(hasLocalUserSecret()).resolves.toBe(true);
    });

    it('returns false when no local_user_secret exists', async () => {
      mockPerformGetStorage.mockResolvedValue(null);

      await expect(hasLocalUserSecret()).resolves.toBe(false);
    });
  });

  it('round-trips a persisted secret back through load', async () => {
    let persisted: string | null = null;
    mockPerformSetStorage.mockImplementation(async (_path, value) => {
      persisted = value;
    });
    mockPerformGetStorage.mockImplementation(async () => persisted);

    await getOrCreateLocalUserSecret();
    const loaded = await loadLocalUserSecret();

    expect(loaded).toEqual(base64ToBytes(LOCAL_USER_SECRET_BASE64));
  });
});
