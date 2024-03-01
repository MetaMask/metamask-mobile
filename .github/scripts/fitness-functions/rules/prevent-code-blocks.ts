import { EXCLUDE_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
  hasNumberOfCodeBlocksIncreased,
} from '../common/shared';

// Code blocks to detect
const codeBlocks = [`from 'enzyme'`];

function preventCodeBlocksRule(diff: string): boolean {
  const diffByFilePath = filterDiffByFilePath(diff, EXCLUDE_REGEX);
  const diffAdditions = filterDiffFileCreations(diffByFilePath);
  const hashmap = hasNumberOfCodeBlocksIncreased(diffAdditions, codeBlocks);

  const haveOccurencesOfAtLeastOneCodeBlockIncreased =
    Object.values(hashmap).includes(true);
  if (haveOccurencesOfAtLeastOneCodeBlockIncreased) {
    return false;
  }
  return true;
}

export { preventCodeBlocksRule };
