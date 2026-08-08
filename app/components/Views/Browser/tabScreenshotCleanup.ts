import RNFS from 'react-native-fs';
import Logger from '../../../util/Logger';

const TAB_SCREENSHOT_SUBDIR = 'ReactNative';

function getTabScreenshotDirectory(): string {
  return `${RNFS.TemporaryDirectoryPath}/${TAB_SCREENSHOT_SUBDIR}`;
}

function isUnderTabScreenshotDirectory(filePath: string): boolean {
  const screenshotDir = getTabScreenshotDirectory();
  const normalizedPath = filePath.replace(/\/+/g, '/');
  const normalizedDir = screenshotDir.replace(/\/+/g, '/');

  if (
    normalizedPath !== normalizedDir &&
    !normalizedPath.startsWith(`${normalizedDir}/`)
  ) {
    return false;
  }

  const relativePath =
    normalizedPath === normalizedDir
      ? ''
      : normalizedPath.slice(normalizedDir.length + 1);

  return !relativePath.split('/').some((segment) => segment === '..');
}

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
  if (!isUnderTabScreenshotDirectory(path)) {
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
