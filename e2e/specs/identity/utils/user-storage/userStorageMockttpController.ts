import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  determineIfFeatureEntryFromURL,
  getDecodedProxiedURL,
  getSrpIdentifierFromHeaders,
} from '../helpers';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import { CompletedRequest, Mockttp } from 'mockttp';

const baseUrl =
  'https://user-storage\\.api\\.cx\\.metamask\\.io\\/api\\/v1\\/userstorage';

export const pathRegexps = {
  [USER_STORAGE_FEATURE_NAMES.accounts]: new RegExp(
    `${baseUrl}/${USER_STORAGE_FEATURE_NAMES.accounts}`,
    'u',
  ),
  [USER_STORAGE_FEATURE_NAMES.notifications]: new RegExp(
    `${baseUrl}/${USER_STORAGE_FEATURE_NAMES.notifications}`,
    'u',
  ),
  [USER_STORAGE_FEATURE_NAMES.addressBook]: new RegExp(
    `${baseUrl}/${USER_STORAGE_FEATURE_NAMES.addressBook}`,
    'u',
  ),
};
export interface UserStorageResponseData {
  HashedKey: string;
  Data: string;
  // E2E Specific identifier that is not present in the real API
  SrpIdentifier?: string;
}

export interface UserStorageMockttpControllerOverrides {
  getResponse?: UserStorageResponseData[];
  getStatusCode?: number;
  putStatusCode?: number;
  deleteStatusCode?: number;
}

export const UserStorageMockttpControllerEvents = {
  GET_NOT_FOUND: 'GET_NOT_FOUND',
  GET_SINGLE: 'GET_SINGLE',
  GET_ALL: 'GET_ALL',
  PUT_SINGLE: 'PUT_SINGLE',
  PUT_BATCH: 'PUT_BATCH',
  DELETE_NOT_FOUND: 'DELETE_NOT_FOUND',
  DELETE_SINGLE: 'DELETE_SINGLE',
  DELETE_ALL: 'DELETE_ALL',
  DELETE_BATCH_NOT_FOUND: 'DELETE_BATCH_NOT_FOUND',
  DELETE_BATCH: 'DELETE_BATCH',
} as const;

// Helper type for converting const objects to enum-like types
export type AsEnum<T> = T[keyof T];

export class UserStorageMockttpController {
  paths: Map<
    keyof typeof pathRegexps,
    {
      response: UserStorageResponseData[];
    }
  > = new Map();

  eventEmitter: EventEmitter = new EventEmitter();

  async onGet(
    path: keyof typeof pathRegexps,
    request: Pick<CompletedRequest, 'url' | 'headers'>,
    statusCode: number = 200,
  ) {
    const srpIdentifier = getSrpIdentifierFromHeaders(request.headers);
    const internalPathData = this.paths.get(path);

    if (!internalPathData) {
      this.eventEmitter.emit(UserStorageMockttpControllerEvents.GET_NOT_FOUND, {
        path,
        statusCode,
      });
      return {
        statusCode,
        json: null,
      };
    }

    const isFeatureEntry = determineIfFeatureEntryFromURL(request.url);

    // If the request is for a single entry, we don't need to check the SRP identifier
    // because the entry is already identified by the path
    if (isFeatureEntry) {
      const json =
        internalPathData.response?.find(
          (entry) =>
            entry.HashedKey ===
            getDecodedProxiedURL(request.url).split('/').pop(),
        ) || null;

      this.eventEmitter.emit(UserStorageMockttpControllerEvents.GET_SINGLE, {
        path,
        statusCode,
      });

      return {
        statusCode,
        json,
      };
    }

    // If the request is for all entries, we need to check the SRP identifier
    // in order to return only the entries that belong to the user
    const json = internalPathData?.response.length
      ? internalPathData.response
      : null;

    const filteredJson = json?.filter(
      (entry) => entry.SrpIdentifier === srpIdentifier,
    );
    const jsonToReturn = filteredJson?.length ? filteredJson : null;

    this.eventEmitter.emit(UserStorageMockttpControllerEvents.GET_ALL, {
      path,
      statusCode,
    });

    return {
      statusCode,
      json: jsonToReturn,
    };
  }

  async onPut(
    path: keyof typeof pathRegexps,
    request: Pick<CompletedRequest, 'url' | 'body' | 'headers'>,
    statusCode: number = 204,
  ) {
    const srpIdentifier = getSrpIdentifierFromHeaders(request.headers);
    const isFeatureEntry = determineIfFeatureEntryFromURL(request.url);

    const data = (await request.body.getJson()) as {
      data?: string | Record<string, string>;
      batch_delete?: string[];
    };

    // We're handling batch delete inside the PUT method due to API limitations
    if (data?.batch_delete) {
      const keysToDelete = data.batch_delete;

      const internalPathData = this.paths.get(path);

      if (!internalPathData) {
        this.eventEmitter.emit(
          UserStorageMockttpControllerEvents.DELETE_BATCH_NOT_FOUND,
          {
            path,
            statusCode,
          },
        );
        return {
          statusCode,
        };
      }

      this.paths.set(path, {
        ...internalPathData,
        response: internalPathData.response.filter(
          (entry) => !keysToDelete.includes(entry.HashedKey),
        ),
      });

      this.eventEmitter.emit(UserStorageMockttpControllerEvents.DELETE_BATCH, {
        path,
        statusCode,
      });
    }

    if (data?.data) {
      const newOrUpdatedSingleOrBatchEntries =
        isFeatureEntry && typeof data?.data === 'string'
          ? [
              {
                HashedKey: getDecodedProxiedURL(request.url)
                  .split('/')
                  .pop() as string,
                Data: data?.data,
                SrpIdentifier: srpIdentifier,
              },
            ]
          : Object.entries(data?.data).map(([key, value]) => ({
              HashedKey: key,
              Data: value,
              SrpIdentifier: srpIdentifier,
            }));

      newOrUpdatedSingleOrBatchEntries.forEach((entry) => {
        const internalPathData = this.paths.get(path);

        if (!internalPathData) {
          return;
        }

        const doesThisEntryExist = internalPathData.response?.find(
          (existingEntry) => existingEntry.HashedKey === entry.HashedKey,
        );

        if (doesThisEntryExist) {
          this.paths.set(path, {
            ...internalPathData,
            response: internalPathData.response.map((existingEntry) =>
              existingEntry.HashedKey === entry.HashedKey
                ? entry
                : existingEntry,
            ),
          });
        } else {
          this.paths.set(path, {
            ...internalPathData,
            response: [
              ...(internalPathData?.response || []),
              entry as { HashedKey: string; Data: string },
            ],
          });
        }

        if (newOrUpdatedSingleOrBatchEntries.length === 1) {
          this.eventEmitter.emit(
            UserStorageMockttpControllerEvents.PUT_SINGLE,
            {
              path,
              statusCode,
            },
          );
        } else {
          this.eventEmitter.emit(UserStorageMockttpControllerEvents.PUT_BATCH, {
            path,
            statusCode,
          });
        }
      });
    }

    return {
      statusCode,
    };
  }

  async onDelete(
    path: keyof typeof pathRegexps,
    request: Pick<CompletedRequest, 'url' | 'headers'>,
    statusCode: number = 204,
  ) {
    const internalPathData = this.paths.get(path);

    if (!internalPathData) {
      this.eventEmitter.emit(
        UserStorageMockttpControllerEvents.DELETE_NOT_FOUND,
        {
          path,
          statusCode,
        },
      );

      return {
        statusCode,
      };
    }

    const isFeatureEntry = determineIfFeatureEntryFromURL(request.url);

    if (isFeatureEntry) {
      this.paths.set(path, {
        ...internalPathData,
        response: internalPathData?.response.filter(
          (entry) =>
            entry.HashedKey !==
            getDecodedProxiedURL(request.url).split('/').pop(),
        ),
      });

      this.eventEmitter.emit(UserStorageMockttpControllerEvents.DELETE_SINGLE, {
        path,
        statusCode,
      });
    } else {
      this.paths.set(path, {
        ...internalPathData,
        response: [],
      });

      this.eventEmitter.emit(UserStorageMockttpControllerEvents.DELETE_ALL, {
        path,
        statusCode,
      });
    }

    return {
      statusCode,
    };
  }

  async setupPath(
    path: keyof typeof pathRegexps,
    server: Mockttp,
    overrides?: UserStorageMockttpControllerOverrides,
  ) {
    const previouslySetupPath = this.paths.get(path);

    this.paths.set(path, {
      response: overrides?.getResponse || previouslySetupPath?.response || [],
    });

    await server
      .forGet('/proxy')
      .matching((request) =>
        pathRegexps[path].test(getDecodedProxiedURL(request.url)),
      )
      .always()
      .thenCallback((request) =>
        this.onGet(path, request, overrides?.getStatusCode),
      );
    await server
      .forPut('/proxy')
      .matching((request) =>
        pathRegexps[path].test(getDecodedProxiedURL(request.url)),
      )
      .always()
      .thenCallback((request) =>
        this.onPut(path, request, overrides?.putStatusCode),
      );
    await server
      .forDelete('/proxy')
      .matching((request) =>
        pathRegexps[path].test(getDecodedProxiedURL(request.url)),
      )
      .always()
      .thenCallback((request) =>
        this.onDelete(path, request, overrides?.deleteStatusCode),
      );
  }
}
