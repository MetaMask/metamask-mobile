import { deepEqual } from 'fast-equals';
import { createSelectorCreator, lruMemoize } from 'reselect';

export const createDeepEqualSelector = createSelectorCreator(
  lruMemoize,
  deepEqual,
);
