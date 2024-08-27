import { isEqual } from 'lodash';
import { createSelectorCreator, defaultMemoize } from 'reselect';

// eslint-disable-next-line import/prefer-default-export
export const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  isEqual,
);
