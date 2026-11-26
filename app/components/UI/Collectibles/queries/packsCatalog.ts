import { queryOptions } from '@tanstack/react-query';
import {
  fetchMockCatalogPacks,
  fetchMockPackCategoryMapping,
} from '../mocks/packsCatalog';
import { collectiblesPackKeys } from './homePacks';

export const collectiblesCatalogKeys = {
  packs: () => [...collectiblesPackKeys.all(), 'catalog'] as const,
  categories: () => ['collectibles', 'packCategories'] as const,
};

export const collectiblesCatalogPacksOptions = queryOptions({
  queryKey: collectiblesCatalogKeys.packs(),
  queryFn: fetchMockCatalogPacks,
});

export const collectiblesPackCategoriesOptions = queryOptions({
  queryKey: collectiblesCatalogKeys.categories(),
  queryFn: fetchMockPackCategoryMapping,
});
