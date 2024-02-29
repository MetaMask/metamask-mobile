import { EXCLUDE_E2E_TESTS_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
  hasNumberOfCodeBlocksIncreased,
} from '../common/shared';

const codeBlocks = [
  "from 'enzyme'",
];

function preventEnzymeImportSyntax(diff: string): boolean {
  const diffByFilePath = filterDiffByFilePath(diff, EXCLUDE_E2E_TESTS_REGEX);
  const diffAdditions = filterDiffFileCreations(diffByFilePath);
  const hashmap = hasNumberOfCodeBlocksIncreased(diffAdditions, codeBlocks);

  const haveOccurencesOfAtLeastOneCodeBlockIncreased =
    Object.values(hashmap).includes(true);
  if (haveOccurencesOfAtLeastOneCodeBlockIncreased) {
    return false;
  }
  return true;
}

export { preventEnzymeImportSyntax };