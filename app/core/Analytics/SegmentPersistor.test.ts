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
        'undefined',
      );
    });

    it('stores and retrieves undefined values', async () => {
      mockStorageWrapper.setItem.mockResolvedValue(undefined);
      mockStorageWrapper.getItem.mockResolvedValue('undefined');

      await segmentPersistor.set('undefinedKey', undefined);
      const result = await segmentPersistor.get('undefinedKey');

      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'segment_undefinedKey',
        'undefined',
      );
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_undefinedKey',
      );
      expect(result).toBeUndefined();
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

  describe('pending events data format migration', () => {
    it('migrates from object format to array format', async () => {
      const testKey = 'test-pendingEvents';
      const objectFormatData = { events: [{ id: '1', type: 'track' }] };
      const serializedData = JSON.stringify(objectFormatData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual([{ id: '1', type: 'track' }]);
    });

    it('returns array format unchanged when already in array format', async () => {
      const testKey = 'test-pendingEvents';
      const arrayFormatData = [{ id: '1', type: 'track' }];
      const serializedData = JSON.stringify(arrayFormatData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual(arrayFormatData);
    });

    it('returns empty array when object format has invalid events property', async () => {
      const testKey = 'test-pendingEvents';
      const invalidObjectData = { events: 'not-an-array' };
      const serializedData = JSON.stringify(invalidObjectData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual([]);
    });

    it('returns empty array when data is neither array nor object with events', async () => {
      const testKey = 'test-pendingEvents';
      const invalidData = 'not-an-object-or-array';
      const serializedData = JSON.stringify(invalidData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual([]);
    });

    it('returns empty array when object format contains empty events array', async () => {
      const testKey = 'test-pendingEvents';
      const emptyObjectData = { events: [] };
      const serializedData = JSON.stringify(emptyObjectData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual([]);
    });

    it('returns empty array when object format has null events property', async () => {
      const testKey = 'test-pendingEvents';
      const nullEventsData = { events: null };
      const serializedData = JSON.stringify(nullEventsData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual([]);
    });

    it('does not apply migration logic to non-pending events keys', async () => {
      const testKey = 'test-otherKey';
      const objectData = { prop: 'value' };
      const serializedData = JSON.stringify(objectData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-otherKey',
      );
      expect(result).toEqual(objectData);
    });

    it('extracts complex nested events from object format', async () => {
      const testKey = 'test-pendingEvents';
      const expectedEvents = [
        { id: '1', type: 'track', properties: { value: 100 } },
        { id: '2', type: 'identify', userId: 'user123' },
      ];
      const complexEventsData = {
        events: expectedEvents,
      };
      const serializedData = JSON.stringify(complexEventsData);
      mockStorageWrapper.getItem.mockResolvedValue(serializedData);

      const result = await segmentPersistor.get(testKey);

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'segment_test-pendingEvents',
      );
      expect(result).toEqual(expectedEvents);
    });
  });
});
