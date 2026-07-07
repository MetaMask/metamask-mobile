import {
  array,
  create,
  defaulted,
  type Infer,
  literal,
  object,
  string,
} from '@metamask/superstruct';

import Engine from '../../../../core/Engine';

const WatchlistBlobSchema = object({
  assets: defaulted(array(string()), () => []),
  version: defaulted(literal(1), () => 1 as const),
});

export type WatchlistBlob = Infer<typeof WatchlistBlobSchema>;

export const EMPTY_BLOB: WatchlistBlob = { assets: [], version: 1 };

const GET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:getAssetsWatchlist' as const;
const SET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:setAssetsWatchlist' as const;
const CLIENT_TYPE = 'mobile' as const;

export async function readFromTokenWatchList(): Promise<WatchlistBlob> {
  const value = (await (Engine.controllerMessenger.call as CallableFunction)(
    GET_ASSETS_WATCHLIST_ACTION,
  )) as unknown;
  if (value === null || value === undefined) {
    return EMPTY_BLOB;
  }
  return create(value, WatchlistBlobSchema);
}

export async function writeToTokenWatchList(
  blob: WatchlistBlob,
): Promise<void> {
  const validated = create(blob, WatchlistBlobSchema);
  await (Engine.controllerMessenger.call as CallableFunction)(
    SET_ASSETS_WATCHLIST_ACTION,
    validated,
    CLIENT_TYPE,
  );
}
