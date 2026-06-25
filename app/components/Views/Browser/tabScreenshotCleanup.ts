import RNFS from 'react-native-fs';
import Logger from '../../../util/Logger';

const TAB_SCREENSHOT_TMP_PATH = '/tmp/ReactNative/';

/**
 * Deletes a browser tab preview image from the app temp directory.
 * Only removes files under React Native's screenshot temp folder.
 */
export async function deleteTabScreenshotFile(
  uri: string | undefined | null,
): Promise<void> {
  if (!uri || typeof uri !== 'string') {
    return;
  }

  const path = uri.replace(/^file:\/\//, '');
  if (!path.includes(TAB_SCREENSHOT_TMP_PATH)) {
    return;
  }

  try {
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  } catch (error) {
    Logger.log(`Failed to delete tab screenshot at ${path}: ${String(error)}`);
  }
}
