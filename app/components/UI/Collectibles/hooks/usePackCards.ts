import { useInfiniteQuery } from '@tanstack/react-query';
import { collectiblesPackCardsOptions } from '../queries/packDetail';

export function usePackCards(code: string) {
  return useInfiniteQuery(collectiblesPackCardsOptions(code));
}
