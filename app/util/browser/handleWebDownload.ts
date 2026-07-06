import { Alert, InteractionManager, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { strings } from '../../../locales/i18n';
import Logger from '../Logger';

/** Base64 file payloads can exceed the normal dapp postMessage limit. */
export const WEB_DOWNLOAD_MAX_MESSAGE_LENGTH = 15_000_000;

/** Keep the temp file around long enough for the share target to read it. */
const DOWNLOAD_FILE_RETENTION_MS = 120_000;

export interface WebDownloadPayload {
  filename?: string;
  mimeType?: string;
  /** Data URL (`data:mime;base64,...`) or raw base64 string. */
  data?: string;
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

const parseFileData = (data: string): { base64: string; mimeType?: string } => {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/s.exec(data);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { base64: data };
};

const getExtensionFromMime = (mimeType: string): string =>
  MIME_TO_EXTENSION[mimeType.toLowerCase()] ?? 'bin';

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);

const resolveFilename = (rawName: string | undefined, mimeType: string) => {
  const sanitized = rawName ? sanitizeFilename(rawName) : '';
  if (sanitized && sanitized.includes('.')) {
    return sanitized;
  }
  const base = sanitized || `download-${Date.now()}`;
  return `${base}.${getExtensionFromMime(mimeType)}`;
};

const scheduleTempFileCleanup = (path: string): void => {
  setTimeout(() => {
    RNFS.unlink(path).catch(() => undefined);
  }, DOWNLOAD_FILE_RETENTION_MS);
};

const runAfterInteractions = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });

/**
 * Matches the confirmation shown by the native WebView download flow ("Do you
 * want to download <file>?") so blob/data downloads behave like regular HTTPS
 * downloads. Android only: on iOS the following share sheet already lets the
 * user cancel.
 */
const confirmDownload = (filename: string): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      strings('download_files.confirm_message', { filename }),
      undefined,
      [
        {
          text: strings('download_files.cancel_action'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: strings('download_files.confirm_action'),
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

/**
 * Android: copy the file into the public Downloads collection (MediaStore on
 * Android 10+, direct write on older versions), then notify the user.
 */
const saveToAndroidDownloads = async (
  tempPath: string,
  filename: string,
  mimeType: string,
): Promise<void> => {
  if (Number(Platform.Version) >= 29) {
    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      { name: filename, parentFolder: '', mimeType },
      'Download',
      tempPath,
    );
  } else {
    const destination = `${RNFS.DownloadDirectoryPath}/${filename}`;
    await RNFS.copyFile(tempPath, destination);
  }

  Alert.alert(
    strings('download_files.downloaded_title'),
    strings('download_files.downloaded_message', { filename }),
  );
};

/**
 * iOS: there is no public Downloads folder, so present the share sheet with
 * "Save to Files" available.
 */
const saveToIos = async (
  tempPath: string,
  filename: string,
  mimeType: string,
): Promise<void> => {
  await Share.open({
    url: `file://${tempPath}`,
    filename,
    type: mimeType,
    saveToFiles: true,
    failOnCancel: false,
  });
};

export async function handleWebDownload(
  payload: WebDownloadPayload | undefined,
): Promise<void> {
  if (payload == null || !payload.data) {
    return;
  }

  let tempPath: string | undefined;
  try {
    if (Platform.OS === 'android') {
      await runAfterInteractions();
    }

    const { base64, mimeType: dataUrlMime } = parseFileData(payload.data);
    const mimeType =
      payload.mimeType || dataUrlMime || 'application/octet-stream';
    const filename = resolveFilename(payload.filename, mimeType);

    if (Platform.OS === 'android' && !(await confirmDownload(filename))) {
      return;
    }

    tempPath = `${RNFS.CachesDirectoryPath}/web-download-${Date.now()}-${filename}`;
    await RNFS.writeFile(tempPath, base64, 'base64');

    if (Platform.OS === 'android') {
      await saveToAndroidDownloads(tempPath, filename, mimeType);
    } else {
      await saveToIos(tempPath, filename, mimeType);
    }
  } catch (error: unknown) {
    Logger.error(error as Error, 'Browser::handleWebDownload');
    Alert.alert(strings('download_files.error'));
  } finally {
    if (tempPath) {
      scheduleTempFileCleanup(tempPath);
    }
  }
}
