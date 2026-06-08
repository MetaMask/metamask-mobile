import {
  array,
  create,
  defaulted,
  type Infer,
  literal,
  object,
  string,
} from '@metamask/superstruct';
import type {
  AuthenticatedUserStorageServiceGetAssetsWatchlistAction,
  AuthenticatedUserStorageServiceSetAssetsWatchlistAction,
} from '@metamask/authenticated-user-storage';

import Engine from '../../../../core/Engine';

const WatchlistBlobSchema = object({
  assets: defaulted(array(string()), () => []),
  version: defaulted(literal(1), () => 1 as const),
});

export type WatchlistBlob = Infer<typeof WatchlistBlobSchema>;

export const EMPTY_BLOB: WatchlistBlob = { assets: [], version: 1 };

const CLIENT_TYPE = 'mobile' as const;
const GET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:getAssetsWatchlist' as const;
const SET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:setAssetsWatchlist' as const;

type GetAssetsWatchlistResult = Awaited<
  ReturnType<AuthenticatedUserStorageServiceGetAssetsWatchlistAction['handler']>
>;
type SetAssetsWatchlistBlob = Parameters<
  AuthenticatedUserStorageServiceSetAssetsWatchlistAction['handler']
>[0];

export async function readFromTokenWatchList(): Promise<WatchlistBlob> {
  const blob = (await Engine.controllerMessenger.call(
    GET_ASSETS_WATCHLIST_ACTION,
  )) as GetAssetsWatchlistResult;

  if (!blob) {
    return EMPTY_BLOB;
  }

  return create(blob, WatchlistBlobSchema);
}

export async function writeToTokenWatchList(
  blob: WatchlistBlob,
): Promise<void> {
  const validated = create(blob, WatchlistBlobSchema) as SetAssetsWatchlistBlob;

  await Engine.controllerMessenger.call(
    SET_ASSETS_WATCHLIST_ACTION,
    validated,
    CLIENT_TYPE,
  );
}
