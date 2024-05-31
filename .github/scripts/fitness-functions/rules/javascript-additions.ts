import { APP_FOLDER_JS_REGEX } from '../common/constants';
import { restrictedFilePresent } from '../common/shared';

function preventJavaScriptFileAdditions(diff: string): boolean {
  if (restrictedFilePresent(diff, APP_FOLDER_JS_REGEX)) {
    return false;
  }
  return true;
}

export { preventJavaScriptFileAdditions };
