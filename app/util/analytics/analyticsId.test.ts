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

const mockedStorageWrapper = storageWrapper as jest.Mocked<
  typeof storageWrapper
>;
const mockedV4 = v4 as jest.MockedFunction<typeof v4>;

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
});
