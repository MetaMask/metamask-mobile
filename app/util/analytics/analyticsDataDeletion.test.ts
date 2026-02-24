import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from '../../core/Analytics/MetaMetrics.types';
import {
  __resetCacheForTests,
  createDataDeletionTask,
  checkDataDeleteStatus,
  getDeleteRegulationCreationDate,
  getDeleteRegulationId,
  isDataRecorded,
  updateDataRecordingFlag,
} from './analyticsDataDeletion';

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

const mockGetAnalyticsId = jest.fn();
jest.mock('./analytics', () => ({
  analytics: {
    getAnalyticsId: (...args: unknown[]) => mockGetAnalyticsId(...args),
  },
}));

jest.mock('../Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const originalFetch = global.fetch;

describe('analyticsDataDeletion', () => {
  const originalSourceId = process.env.SEGMENT_DELETE_API_SOURCE_ID;
  const originalEndpoint = process.env.SEGMENT_REGULATIONS_ENDPOINT;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetCacheForTests();
    mockGetItem.mockResolvedValue(undefined);
    mockSetItem.mockResolvedValue(undefined);
    mockGetAnalyticsId.mockResolvedValue('test-analytics-id');
    process.env.SEGMENT_DELETE_API_SOURCE_ID = 'test-source-id';
    process.env.SEGMENT_REGULATIONS_ENDPOINT =
      'https://segment.regulations.test';
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env.SEGMENT_DELETE_API_SOURCE_ID = originalSourceId;
    process.env.SEGMENT_REGULATIONS_ENDPOINT = originalEndpoint;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('createDataDeletionTask', () => {
    it('returns error when SEGMENT_DELETE_API_SOURCE_ID is missing', async () => {
      const saved = process.env.SEGMENT_DELETE_API_SOURCE_ID;
      delete process.env.SEGMENT_DELETE_API_SOURCE_ID;
      const result = await createDataDeletionTask();
      process.env.SEGMENT_DELETE_API_SOURCE_ID = saved;
      expect(result.status).toBe(DataDeleteResponseStatus.error);
      expect(result.error).toBeDefined();
    });

    it('returns error when SEGMENT_REGULATIONS_ENDPOINT is missing', async () => {
      const saved = process.env.SEGMENT_REGULATIONS_ENDPOINT;
      delete process.env.SEGMENT_REGULATIONS_ENDPOINT;
      const result = await createDataDeletionTask();
      process.env.SEGMENT_REGULATIONS_ENDPOINT = saved;
      expect(result.status).toBe(DataDeleteResponseStatus.error);
      expect(result.error).toBeDefined();
    });

    it('POSTs to Segment and persists id/date/recorded on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { regulateId: 'reg-123' } }),
      });

      const result = await createDataDeletionTask();

      expect(result.status).toBe(DataDeleteResponseStatus.ok);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('regulations/sources/'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.segment.v1+json' },
          body: JSON.stringify({
            regulationType: 'DELETE_ONLY',
            subjectType: 'USER_ID',
            subjectIds: ['test-analytics-id'],
          }),
        }),
      );
      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'reg-123');
      expect(mockSetItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/\d{1,2}\/\d{1,2}\/\d{4}/),
      );
      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'false');
    });

    it('returns error when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const result = await createDataDeletionTask();

      expect(result.status).toBe(DataDeleteResponseStatus.error);
      expect(result.error).toBe('Analytics Deletion Task Error');
    });

    it('returns error when response has no regulateId', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const result = await createDataDeletionTask();

      expect(result.status).toBe(DataDeleteResponseStatus.error);
      expect(result.error).toBe('Analytics Deletion Task Error');
    });

    it('returns error and logs when fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await createDataDeletionTask();

      expect(result.status).toBe(DataDeleteResponseStatus.error);
      expect(result.error).toBe('Analytics Deletion Task Error');
    });
  });

  describe('checkDataDeleteStatus', () => {
    it('returns unknown status and hasCollectedDataSinceDeletionRequest false when no regulation id in storage', async () => {
      mockGetItem.mockResolvedValue(undefined);

      const status = await checkDataDeleteStatus();

      expect(status.dataDeletionRequestStatus).toBe(DataDeleteStatus.unknown);
      expect(status.deletionRequestDate).toBeUndefined();
      expect(status.hasCollectedDataSinceDeletionRequest).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns hasCollectedDataSinceDeletionRequest false when data was recorded but no regulation id exists', async () => {
      // No regulation ID, no date, but data has been recorded
      mockGetItem
        .mockResolvedValueOnce(undefined) // regulation id
        .mockResolvedValueOnce(undefined) // date
        .mockResolvedValueOnce('true'); // data recorded

      const status = await checkDataDeleteStatus();

      expect(status.hasCollectedDataSinceDeletionRequest).toBe(false);
      expect(status.deletionRequestDate).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns a valid status object when storage read throws', async () => {
      mockGetItem.mockRejectedValue(new Error('storage failure'));

      const status = await checkDataDeleteStatus();

      expect(status.dataDeletionRequestStatus).toBe(DataDeleteStatus.unknown);
      expect(status.hasCollectedDataSinceDeletionRequest).toBe(false);
      expect(status.deletionRequestDate).toBeUndefined();
    });

    it('loads from storage and calls Segment GET when regulation id exists', async () => {
      mockGetItem
        .mockResolvedValueOnce('reg-456')
        .mockResolvedValueOnce('10/2/2025')
        .mockResolvedValueOnce('true');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { regulation: { overallStatus: 'FINISHED' } },
        }),
      });

      const status = await checkDataDeleteStatus();

      expect(status.dataDeletionRequestStatus).toBe(DataDeleteStatus.finished);
      expect(status.deletionRequestDate).toBe('10/2/2025');
      expect(status.hasCollectedDataSinceDeletionRequest).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('regulations/reg-456'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/vnd.segment.v1+json' },
        }),
      );
    });

    it('returns unknown when fetch fails', async () => {
      mockGetItem
        .mockResolvedValueOnce('reg-789')
        .mockResolvedValueOnce('1/1/2025')
        .mockResolvedValueOnce('false');

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const status = await checkDataDeleteStatus();

      expect(status.dataDeletionRequestStatus).toBe(DataDeleteStatus.unknown);
      expect(status.deletionRequestDate).toBe('1/1/2025');
      expect(status.hasCollectedDataSinceDeletionRequest).toBe(false);
    });
  });

  describe('getDeleteRegulationCreationDate', () => {
    it('returns undefined when cache not yet populated', () => {
      expect(getDeleteRegulationCreationDate()).toBeUndefined();
    });

    it('returns date after checkDataDeleteStatus has run', async () => {
      mockGetItem
        .mockResolvedValueOnce('reg-1')
        .mockResolvedValueOnce('5/6/2025')
        .mockResolvedValueOnce('false');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { regulation: { overallStatus: 'RUNNING' } },
        }),
      });

      await checkDataDeleteStatus();
      expect(getDeleteRegulationCreationDate()).toBe('5/6/2025');
    });
  });

  describe('getDeleteRegulationId', () => {
    it('returns undefined when cache not yet populated', () => {
      expect(getDeleteRegulationId()).toBeUndefined();
    });

    it('returns id after checkDataDeleteStatus has run', async () => {
      mockGetItem
        .mockResolvedValueOnce('reg-abc')
        .mockResolvedValueOnce('1/1/2025')
        .mockResolvedValueOnce('false');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { regulation: {} } }),
      });

      await checkDataDeleteStatus();
      expect(getDeleteRegulationId()).toBe('reg-abc');
    });
  });

  describe('isDataRecorded', () => {
    it('returns false when cache not yet populated', () => {
      expect(isDataRecorded()).toBe(false);
    });

    it('returns value from storage after checkDataDeleteStatus', async () => {
      mockGetItem
        .mockResolvedValueOnce('reg-1')
        .mockResolvedValueOnce('1/1/2025')
        .mockResolvedValueOnce('true');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { regulation: {} } }),
      });

      await checkDataDeleteStatus();
      expect(isDataRecorded()).toBe(true);
    });
  });

  describe('updateDataRecordingFlag', () => {
    it('calls setItem with "true" when saveDataRecording is true and cache is false', async () => {
      mockGetItem
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('false');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { regulation: {} } }),
      });
      await checkDataDeleteStatus();
      mockSetItem.mockClear();

      updateDataRecordingFlag(true);

      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'true');
    });

    it('does not call setItem when saveDataRecording is false', () => {
      updateDataRecordingFlag(false);
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });
});
