import { APP_FOLDER_JS_REGEX } from '../common/constants';
import { filterDiffFileCreations, restrictedFilePresent } from '../common/shared';

function preventJavaScriptFileAdditions(diff: string): boolean {
  const diffAdditions = filterDiffFileCreations(diff);
  if (restrictedFilePresent(diffAdditions, APP_FOLDER_JS_REGEX)) {
    return false;
  }
  return true;
}

export { preventJavaScriptFileAdditions };
