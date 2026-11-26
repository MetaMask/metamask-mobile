import { queryOptions } from '@tanstack/react-query';
import { fetchMockEpicOddsMachines } from '../mocks/epicOdds';
import { collectiblesPackKeys } from './homePacks';

export const collectiblesEpicOddsOptions = queryOptions({
  queryKey: [...collectiblesPackKeys.all(), 'epicOdds'] as const,
  queryFn: fetchMockEpicOddsMachines,
});
