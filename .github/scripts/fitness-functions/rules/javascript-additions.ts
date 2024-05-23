import { APP_FOLDER_TS_REGEX } from '../common/constants';
import {
  filterDiffByFilePath,
  filterDiffFileCreations,
} from '../common/shared';

function preventJavaScriptFileAdditions(diff: string): boolean {
  const sharedFolderDiff = filterDiffByFilePath(diff, APP_FOLDER_TS_REGEX);
  const sharedFolderCreationDiff = filterDiffFileCreations(sharedFolderDiff);
  
  console.log('Test1',sharedFolderDiff)
  console.log('Test2', sharedFolderCreationDiff)

  const hasCreatedAtLeastOneJSFileInShared = sharedFolderCreationDiff !== '';
  if (hasCreatedAtLeastOneJSFileInShared) {
    return false;
  }
  return true;
}

export { preventJavaScriptFileAdditions };