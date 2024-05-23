import { APP_FOLDER_TS_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
} from '../common/shared';

function preventJavaScriptFileAdditions(diff: string): boolean {
  const sharedFolderDiff = filterDiffByFilePath(diff, APP_FOLDER_TS_REGEX);
  const sharedFolderCreationDiff = filterDiffFileCreations(sharedFolderDiff);

  const hasCreatedAtLeastOneJSFileInShared = sharedFolderCreationDiff !== '';
  if (hasCreatedAtLeastOneJSFileInShared) {
    return false;
  }
  return true;
}

export { preventJavaScriptFileAdditions };