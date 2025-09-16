import { segmentPersistor } from './SegmentPersistor';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';

jest.mock('../../store/storage-wrapper');
jest.mock('../../util/Logger');

const mockStorageWrapper = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('segmentPersistor', () => {
  describe('get', () => {
    it('returns stored data', async () => {
      const testKey = 'testKey';
      const testData = { userId: '123', event: 'test' };
      const serializedData = JSON.stringify(testData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_testKey',
      );
      expect(result).toEqual(testData);
    });

    it('returns undefined when no data is found', async () => {
      const testKey = 'nonExistentKey';
      mockStorageWrapper.getItem.mockResolvedValue(null);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_nonExistentKey',
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when JSON parsing fails', async () => {
      const testKey = 'invalidJsonKey';
      const invalidJson = 'invalid json string';
      mockStorageWrapper.getItem.mockResolvedValue(invalidJson);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_invalidJsonKey',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        '[Segment Storage] Failed to get key: invalidJsonKey',
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when storage fails', async () => {
      const testKey = 'errorKey';
      const storageError = new Error('Storage error');
      mockStorageWrapper.getItem.mockRejectedValue(storageError);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_errorKey',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        storageError,
        '[Segment Storage] Failed to get key: errorKey',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('stores data', async () => {
      mockStorageWrapper.setItem.mockResolvedValue(undefined);

      await segmentPersistor.set('stringKey', 'simple value');
      await segmentPersistor.set('objectKey', { id: '123', name: 'Test User' });
      await segmentPersistor.set('nullKey', null);
      await segmentPersistor.set('undefinedKey', undefined);

      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_stringKey',
        '"simple value"',
      );
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_objectKey',
        JSON.stringify({ id: '123', name: 'Test User' }),
      );
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_nullKey',
        'null',
      );
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_undefinedKey',
        undefined,
      );
    });

    it('logs error when storage fails', async () => {
      const testKey = 'errorKey';
      const testData = { userId: '123' };
      const storageError = new Error('Storage error');
      mockStorageWrapper.setItem.mockRejectedValue(storageError);

      await segmentPersistor.set(testKey, testData);

      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_errorKey',
        JSON.stringify(testData),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        storageError,
        '[Segment Storage] Failed to set key: errorKey',
      );
    });
  });

  describe('key prefixing', () => {
    it('prefixes keys with special characters', async () => {
      const testKey = 'user-info_123';
      const testData = { id: '123' };
      mockStorageWrapper.setItem.mockResolvedValue(undefined);
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(testData));

      await segmentPersistor.set(testKey, testData);
      await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_user-info_123',
        JSON.stringify(testData),
      );
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_user-info_123',
      );
    });
  });
});
