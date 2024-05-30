import { APP_FOLDER_TS_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
} from '../common/shared';

function preventJavaScriptFileAdditions(diff: string): boolean {
  console.log('DIFF', diff)
  const sharedFolderDiff = filterDiffByFilePath(diff, APP_FOLDER_TS_REGEX);
  const sharedFolderCreationDiff = filterDiffFileCreations(sharedFolderDiff);
  console.log('sharedFolderDiff', sharedFolderDiff)
  console.log('sharedFolderCreationDiff', sharedFolderCreationDiff)

  const hasCreatedAtLeastOneJSFileInShared = sharedFolderCreationDiff !== '';
  if (hasCreatedAtLeastOneJSFileInShared) {
    return false;
  }
  return true;
}

export { preventJavaScriptFileAdditions };
