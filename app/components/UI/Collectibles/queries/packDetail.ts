import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  fetchMockJustOpened,
  fetchMockPackCardsPage,
  fetchMockPackDetail,
} from '../mocks/packDetail';
import { collectiblesPackKeys } from './homePacks';

export const collectiblesPackDetailKeys = {
  detail: (code: string) =>
    [...collectiblesPackKeys.all(), 'detail', code] as const,
  justOpened: (code: string) =>
    [...collectiblesPackKeys.all(), 'justOpened', code] as const,
  cards: (code: string) =>
    [...collectiblesPackKeys.all(), 'cards', code] as const,
};

export function collectiblesPackDetailOptions(code: string) {
  return queryOptions({
    queryKey: collectiblesPackDetailKeys.detail(code),
    queryFn: async () => fetchMockPackDetail(code),
  });
}

export function collectiblesPackJustOpenedOptions(code: string) {
  return queryOptions({
    queryKey: collectiblesPackDetailKeys.justOpened(code),
    queryFn: fetchMockJustOpened,
  });
}

export function collectiblesPackCardsOptions(code: string) {
  return infiniteQueryOptions({
    queryKey: collectiblesPackDetailKeys.cards(code),
    queryFn: async ({ pageParam }) => fetchMockPackCardsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}
