import { EXCLUDE_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
  hasNumberOfCodeBlocksIncreased,
} from '../common/shared';

// Blacklisted code blocks
const blacklistedCodeblocks = [`from 'enzyme'`];

/**
 * 
 * @param diff - Code diff between PR and target branch
 * @returns - Boolean indicating if diff includes blacklisted code blocks
 */
function preventCodeBlocksRule(diff: string): boolean {
  const diffByFilePath = filterDiffByFilePath(diff, EXCLUDE_REGEX);
  const diffAdditions = filterDiffFileCreations(diffByFilePath);
  const hashmap = hasNumberOfCodeBlocksIncreased(diffAdditions, blacklistedCodeblocks);

  const haveOccurencesOfAtLeastOneCodeBlockIncreased =
    Object.values(hashmap).includes(true);
  if (haveOccurencesOfAtLeastOneCodeBlockIncreased) {
    return false;
  }
  return true;
}

export { preventCodeBlocksRule };
