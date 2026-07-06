import RNFS from 'react-native-fs';
import Share, { ShareOptions } from 'react-native-share';
import Logger from '../Logger';

/** Base64 file payloads can exceed normal dapp postMessage limits. */
export const WEB_DOWNLOAD_MAX_MESSAGE_LENGTH = 15_000_000;

export interface WebDownloadPayload {
  /** Suggested filename from the anchor's `download` attribute. */
  name?: string;
  /** MIME type of the downloaded resource. */
  type?: string;
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
  'text/plain': 'txt',
  'application/json': 'json',
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

const resolveFilename = (
  name: string | undefined,
  mimeType: string,
): string => {
  const sanitized = name ? sanitizeFilename(name) : '';
  if (sanitized && sanitized.includes('.')) {
    return sanitized;
  }
  return `${sanitized || 'download'}.${getExtensionFromMime(mimeType)}`;
};

/**
 * Handles a `blob:`/`data:` download intercepted from the WebView.
 *
 * Android WebView cannot download in-memory blob URLs through the native
 * download manager, so the page reads the bytes as base64 and forwards them
 * here. We persist the payload to a temp file and hand it to the OS share
 * sheet (with "Save to Files") so the user can store it, mirroring the native
 * download path used for HTTP(S) resources.
 */
export async function handleWebDownload(
  payload: WebDownloadPayload | undefined,
): Promise<void> {
  if (payload?.data == null || payload.data.length === 0) {
    return;
  }

  let path: string | undefined;
  try {
    const { base64, mimeType: dataUrlMime } = parseFileData(payload.data);
    const mimeType = payload.type || dataUrlMime || 'application/octet-stream';
    const filename = resolveFilename(payload.name, mimeType);
    path = `${RNFS.CachesDirectoryPath}/web-download-${Date.now()}-${filename}`;

    await RNFS.writeFile(path, base64, 'base64');

    const options: ShareOptions = {
      url: path,
      type: mimeType,
      filename,
      saveToFiles: true,
      failOnCancel: false,
    };
    await Share.open(options);
  } catch (error: unknown) {
    Logger.error(error as Error, 'Browser::handleWebDownload');
  } finally {
    if (path) {
      await RNFS.unlink(path).catch(() => undefined);
    }
  }
}
