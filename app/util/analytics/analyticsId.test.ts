import { getAnalyticsId } from './analyticsId';
import storageWrapper from '../../store/storage-wrapper';
import { ANALYTICS_ID } from '../../constants/storage';
import { v4 } from 'uuid';

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));
jest.mock('uuid', () => {
  const actualUuid = jest.requireActual('uuid');
  return {
    ...actualUuid,
    v4: jest.fn(),
  };
});
jest.mock('../Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const mockedStorageWrapper = storageWrapper as jest.Mocked<
  typeof storageWrapper
>;
const mockedV4 = v4 as jest.Mock<string>;

describe('getAnalyticsId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorageWrapper.getItem.mockReset();
    mockedV4.mockReset();
  });

  it('returns existing analytics ID from storage when available', async () => {
    const existingId = 'existing-analytics-id-12345';
    mockedStorageWrapper.getItem.mockResolvedValue(existingId);

    const result = await getAnalyticsId();

    expect(result).toBe(existingId);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(ANALYTICS_ID);
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    expect(mockedV4).not.toHaveBeenCalled();
  });

  it('generates and stores new analytics ID when not in storage', async () => {
    const newId = 'new-generated-id-67890';
    mockedStorageWrapper.getItem.mockResolvedValue(null);
    mockedV4.mockReturnValue(newId);

    const result = await getAnalyticsId();

    expect(result).toBe(newId);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(ANALYTICS_ID);
    expect(mockedV4).toHaveBeenCalled();
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      newId,
    );
  });

  it('generates and stores new analytics ID when storage returns undefined', async () => {
    const newId = 'new-generated-id-undefined';
    mockedStorageWrapper.getItem.mockResolvedValue(undefined);
    mockedV4.mockReturnValue(newId);

    const result = await getAnalyticsId();

    expect(result).toBe(newId);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(ANALYTICS_ID);
    expect(mockedV4).toHaveBeenCalled();
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      newId,
    );
  });

  it('generates and stores new analytics ID when storage returns empty string', async () => {
    const newId = 'new-generated-id-empty';
    mockedStorageWrapper.getItem.mockResolvedValue('');
    mockedV4.mockReturnValue(newId);

    const result = await getAnalyticsId();

    expect(result).toBe(newId);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(ANALYTICS_ID);
    expect(mockedV4).toHaveBeenCalled();
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      newId,
    );
  });

  it('returns same ID on subsequent calls when ID exists in storage', async () => {
    const existingId = 'persistent-analytics-id';
    mockedStorageWrapper.getItem.mockResolvedValue(existingId);

    const result1 = await getAnalyticsId();
    const result2 = await getAnalyticsId();

    expect(result1).toBe(existingId);
    expect(result2).toBe(existingId);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledTimes(2);
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('generates unique IDs when called multiple times without storage', async () => {
    const newId1 = 'generated-id-1';
    const newId2 = 'generated-id-2';
    mockedStorageWrapper.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockedV4.mockReturnValueOnce(newId1).mockReturnValueOnce(newId2);

    const result1 = await getAnalyticsId();
    const result2 = await getAnalyticsId();

    expect(result1).toBe(newId1);
    expect(result2).toBe(newId2);
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledTimes(2);
    expect(mockedStorageWrapper.setItem).toHaveBeenNthCalledWith(
      1,
      ANALYTICS_ID,
      newId1,
    );
    expect(mockedStorageWrapper.setItem).toHaveBeenNthCalledWith(
      2,
      ANALYTICS_ID,
      newId2,
    );
  });

  describe('identity recovery from persisted AnalyticsController state', () => {
    // Losing this identity orphans the device's entire analytics history and
    // makes it look like a brand-new user, so the persisted controller copy is
    // preferred over minting a replacement.
    const persistedId = '59710bcf-06cc-4247-9386-12425e7fc905';

    it('recovers the persisted identity instead of minting when storage is empty', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(null);

      const result = await getAnalyticsId(persistedId);

      expect(result).toBe(persistedId);
      expect(mockedV4).not.toHaveBeenCalled();
      expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
        ANALYTICS_ID,
        persistedId,
      );
    });

    it('prefers the stored identity over the persisted one when both exist', async () => {
      const storedId = 'a3f1c2d4-1234-4abc-8def-0123456789ab';
      mockedStorageWrapper.getItem.mockResolvedValue(storedId);

      const result = await getAnalyticsId(persistedId);

      expect(result).toBe(storedId);
      expect(mockedV4).not.toHaveBeenCalled();
      expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it.each<[string, unknown]>([
      ['a non-UUID string', 'not-a-uuid'],
      ['a UUID that is not v4', '2c5ea4c0-4067-11e9-8bad-9b1deb4d3b7d'],
      ['an empty string', ''],
      ['a non-string value', 12345],
      ['undefined', undefined],
    ])(
      'mints a new identity when the persisted value is %s',
      async (_label, persistedValue) => {
        const newId = 'freshly-minted-id';
        mockedStorageWrapper.getItem.mockResolvedValue(null);
        mockedV4.mockReturnValue(newId);

        const result = await getAnalyticsId(persistedValue);

        expect(result).toBe(newId);
        expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
          ANALYTICS_ID,
          newId,
        );
      },
    );
  });
});
