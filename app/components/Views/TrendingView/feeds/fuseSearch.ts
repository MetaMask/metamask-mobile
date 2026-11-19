import Fuse, { type FuseOptions } from 'fuse.js';

// Kept apart from search-utils, which imports the Trending filter sheets:
// Predict's Explore feed needs only these, and loading those sheets from the
// PredictNext entry point closes an import cycle through the component library.

export const BASE_FUSE_OPTIONS = {
  shouldSort: true,
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
} as const;

export const fuseSearch = <T>(
  data: T[],
  searchQuery: string | undefined,
  fuseOptions: FuseOptions<T>,
  searchSortingFn?: (a: T, b: T) => number,
): T[] => {
  const trimmed = searchQuery?.trim();
  if (!trimmed) return data;
  const fuse = new Fuse(data, fuseOptions);
  const results = fuse.search(trimmed);
  return searchSortingFn ? results.sort(searchSortingFn) : results;
};
