import { EXCLUDE_E2E_TESTS_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
  hasNumberOfCodeBlocksIncreased,
} from '../common/shared';

// Define it as a template string to prevent original commit from being picked up
const fromEnzyme = `from ${'enzyme'}`;
const codeBlocks = [fromEnzyme];

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
