import { queryOptions } from '@tanstack/react-query';
import { fetchMockHomePacks } from '../mocks/homePacks';

export const collectiblesPackKeys = {
  all: () => ['collectibles', 'packs'] as const,
  home: () => [...collectiblesPackKeys.all(), 'home'] as const,
};

export const collectiblesHomePacksOptions = queryOptions({
  queryKey: collectiblesPackKeys.home(),
  // TODO: replace the mock with the real packs API.
  queryFn: fetchMockHomePacks,
  // A pack without a price can't be bought, so its tile isn't shown.
  select: (packs) => packs.filter((pack) => pack.priceLabel),
});
