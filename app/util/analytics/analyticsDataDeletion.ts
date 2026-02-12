import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import {
  ANALYTICS_DATA_DELETION_DATE,
  ANALYTICS_DATA_RECORDED,
  METAMETRICS_DELETION_REGULATION_ID,
} from '../../constants/storage';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  type DataDeleteDate,
  type DataDeleteRegulationId,
  type IDeleteRegulationResponse,
  type IDeleteRegulationStatus,
  type IDeleteRegulationStatusResponse,
} from '../../core/Analytics/MetaMetrics.types';
import { analytics } from './analytics';

const SEGMENT_HEADERS = {
  'Content-Type': 'application/vnd.segment.v1+json',
} as const;

/** In-memory cache populated by async functions so sync getters can return without reading storage. */
let cached: {
  deleteRegulationId: DataDeleteRegulationId;
  deleteRegulationDate: DataDeleteDate;
  dataRecorded: boolean;
} | null = null;

/** Reset cache (for tests only). */
export function __resetCacheForTests(): void {
  cached = null;
}

async function loadCacheFromStorage(): Promise<void> {
  const [deleteRegulationId, deleteRegulationDate, dataRecordedStr] =
    await Promise.all([
      StorageWrapper.getItem(METAMETRICS_DELETION_REGULATION_ID),
      StorageWrapper.getItem(ANALYTICS_DATA_DELETION_DATE),
      StorageWrapper.getItem(ANALYTICS_DATA_RECORDED),
    ]);
  cached = {
    deleteRegulationId: deleteRegulationId ?? undefined,
    deleteRegulationDate: deleteRegulationDate ?? undefined,
    dataRecorded: dataRecordedStr === 'true',
  };
}

function setCache(
  updates: Partial<{
    deleteRegulationId: DataDeleteRegulationId;
    deleteRegulationDate: DataDeleteDate;
    dataRecorded: boolean;
  }>,
): void {
  if (!cached) {
    cached = {
      deleteRegulationId: undefined,
      deleteRegulationDate: undefined,
      dataRecorded: false,
    };
  }
  if (updates.deleteRegulationId !== undefined)
    cached.deleteRegulationId = updates.deleteRegulationId;
  if (updates.deleteRegulationDate !== undefined)
    cached.deleteRegulationDate = updates.deleteRegulationDate;
  if (updates.dataRecorded !== undefined)
    cached.dataRecorded = updates.dataRecorded;
}

/**
 * Create a new delete regulation for the user via Segment API.
 * Necessary for GDPR/CCPA. Uses fetch (no axios).
 */
export async function createDataDeletionTask(): Promise<IDeleteRegulationResponse> {
  const segmentSourceId = process.env.SEGMENT_DELETE_API_SOURCE_ID;
  const segmentRegulationEndpoint = process.env.SEGMENT_REGULATIONS_ENDPOINT;

  if (!segmentSourceId || !segmentRegulationEndpoint) {
    return {
      status: DataDeleteResponseStatus.error,
      error: 'Segment API source ID or endpoint not found',
    };
  }

  const regulationType = 'DELETE_ONLY';
  const url = `${segmentRegulationEndpoint}/regulations/sources/${segmentSourceId}`;

  try {
    const analyticsId = await analytics.getAnalyticsId();
    const response = await fetch(url, {
      method: 'POST',
      headers: SEGMENT_HEADERS,
      body: JSON.stringify({
        regulationType,
        subjectType: 'USER_ID',
        subjectIds: [analyticsId],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      Logger.error(
        new Error(`Segment API ${response.status}: ${text}`),
        'Analytics Deletion Task Error',
      );
      return {
        status: DataDeleteResponseStatus.error,
        error: 'Analytics Deletion Task Error',
      };
    }

    const json = (await response.json()) as {
      data?: { regulateId?: string };
    };
    const regulateId = json?.data?.regulateId;

    if (!regulateId) {
      return {
        status: DataDeleteResponseStatus.error,
        error: 'Analytics Deletion Task Error',
      };
    }

    const currentDate = new Date();
    const day = currentDate.getUTCDate();
    const month = currentDate.getUTCMonth() + 1;
    const year = currentDate.getUTCFullYear();
    const deletionDate = `${day}/${month}/${year}`;

    await Promise.all([
      StorageWrapper.setItem(METAMETRICS_DELETION_REGULATION_ID, regulateId),
      StorageWrapper.setItem(ANALYTICS_DATA_DELETION_DATE, deletionDate),
      StorageWrapper.setItem(ANALYTICS_DATA_RECORDED, 'false'),
    ]);

    setCache({
      deleteRegulationId: regulateId,
      deleteRegulationDate: deletionDate,
      dataRecorded: false,
    });

    return { status: DataDeleteResponseStatus.ok };
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'Analytics Deletion Task Error',
    );
    return {
      status: DataDeleteResponseStatus.error,
      error: 'Analytics Deletion Task Error',
    };
  }
}

/**
 * Check deletion task status via Segment API. Loads regulation id/date/recorded from storage and updates cache.
 */
export async function checkDataDeleteStatus(): Promise<IDeleteRegulationStatus> {
  try {
    await loadCacheFromStorage();
  } catch (error) {
    Logger.log('Error checkDataDeleteStatus - failed to load cache', error);
  }

  const regulationId = cached?.deleteRegulationId;
  const segmentRegulationEndpoint = process.env.SEGMENT_REGULATIONS_ENDPOINT;

  // Only populate date and data-recorded when a deletion was previously requested (matches old MetaMetrics guard).
  const status: IDeleteRegulationStatus = {
    deletionRequestDate: regulationId
      ? cached?.deleteRegulationDate
      : undefined,
    dataDeletionRequestStatus: DataDeleteStatus.unknown,
    hasCollectedDataSinceDeletionRequest: regulationId
      ? (cached?.dataRecorded ?? false)
      : false,
  };

  if (!regulationId || !segmentRegulationEndpoint) {
    return status;
  }

  try {
    const response = await fetch(
      `${segmentRegulationEndpoint}/regulations/${regulationId}`,
      {
        method: 'GET',
        headers: SEGMENT_HEADERS,
      },
    );

    if (!response.ok) {
      Logger.log('Error checkDataDeleteStatus -', await response.text());
      return status;
    }

    const json = (await response.json()) as {
      data?: { regulation?: { overallStatus?: string } };
    };
    const overallStatus = json?.data?.regulation?.overallStatus;
    status.dataDeletionRequestStatus =
      (overallStatus as IDeleteRegulationStatusResponse['dataDeleteStatus']) ??
      DataDeleteStatus.unknown;
  } catch (error) {
    Logger.log('Error checkDataDeleteStatus -', error);
  }

  return status;
}

/**
 * Get the delete regulation request date (DD/MM/YYYY). Returns cached value; cache is set by createDataDeletionTask and checkDataDeleteStatus.
 */
export function getDeleteRegulationCreationDate(): DataDeleteDate {
  return cached?.deleteRegulationDate;
}

/**
 * Get the delete regulation id. Returns cached value.
 */
export function getDeleteRegulationId(): DataDeleteRegulationId {
  return cached?.deleteRegulationId;
}

/**
 * Whether events have been recorded since the last deletion request. Returns cached value (default false).
 */
export function isDataRecorded(): boolean {
  return cached?.dataRecorded ?? false;
}

/**
 * Update the data recording flag (e.g. after tracking). Persists to storage and updates cache.
 */
export function updateDataRecordingFlag(saveDataRecording = true): void {
  if (!saveDataRecording || (cached?.dataRecorded ?? false)) {
    return;
  }
  setCache({ dataRecorded: true });
  StorageWrapper.setItem(ANALYTICS_DATA_RECORDED, 'true')?.catch((error) => {
    Logger.error(error, 'Analytics Data Record Error');
  });
}
