import { useQuery } from '@tanstack/react-query';
import {
  collectiblesCatalogPacksOptions,
  collectiblesPackCategoriesOptions,
} from '../queries/packsCatalog';
import { buildPacksCatalog } from '../utils/packsCatalog';

export function usePacksCatalog() {
  const packsQuery = useQuery(collectiblesCatalogPacksOptions);
  const mappingQuery = useQuery(collectiblesPackCategoriesOptions);

  return {
    ...buildPacksCatalog(packsQuery.data ?? [], mappingQuery.data),
    isPending: packsQuery.isPending || mappingQuery.isPending,
  };
}
