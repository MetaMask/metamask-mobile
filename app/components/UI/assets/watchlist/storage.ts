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

const CLIENT_TYPE = 'mobile' as const;
const GET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:getAssetsWatchlist' as const;
const SET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:setAssetsWatchlist' as const;

type ControllerMessengerCall = (
  action: string,
  ...args: readonly unknown[]
) => Promise<unknown>;
const callControllerMessenger = Engine.controllerMessenger
  .call as unknown as ControllerMessengerCall;

export async function readFromTokenWatchList(): Promise<WatchlistBlob> {
  const blob = await callControllerMessenger(GET_ASSETS_WATCHLIST_ACTION);

  if (!blob) {
    return EMPTY_BLOB;
  }

  return create(blob, WatchlistBlobSchema);
}

export async function writeToTokenWatchList(
  blob: WatchlistBlob,
): Promise<void> {
  const validated = create(blob, WatchlistBlobSchema);

  await callControllerMessenger(
    SET_ASSETS_WATCHLIST_ACTION,
    validated,
    CLIENT_TYPE,
  );
}
