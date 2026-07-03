import { Platform, Share as RNShare } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Logger from '../Logger';

/** Base64 file payloads can exceed normal dapp postMessage limits. */
export const WEB_SHARE_MAX_MESSAGE_LENGTH = 15_000_000;

export interface WebShareFilePayload {
  name: string;
  type: string;
  /** Data URL (`data:mime;base64,...`) or raw base64 string. */
  data: string;
}

export interface WebShareAPIParam {
  url?: string;
  text?: string;
  title?: string;
  files?: WebShareFilePayload[];
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
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

const buildShareMessage = (param: WebShareAPIParam): string | undefined => {
  const message = [param.text, param.url].filter(Boolean).join(' ');
  return message || undefined;
};

const writeShareFile = async (
  file: WebShareFilePayload,
): Promise<{ path: string; mimeType: string; filename: string }> => {
  const { base64, mimeType: dataUrlMime } = parseFileData(file.data);
  const mimeType = file.type || dataUrlMime || 'application/octet-stream';
  const extension = getExtensionFromMime(mimeType);
  const sanitizedName = sanitizeFilename(file.name);
  const filename =
    sanitizedName && sanitizedName.includes('.')
      ? sanitizedName
      : `${sanitizedName || 'share'}.${extension}`;
  const path = `${RNFS.CachesDirectoryPath}/web-share-${Date.now()}-${filename}`;

  await RNFS.writeFile(path, base64, 'base64');

  return { path, mimeType, filename };
};

const cleanupTempFiles = async (paths: string[]): Promise<void> => {
  await Promise.all(
    paths.map((path) => RNFS.unlink(path).catch(() => undefined)),
  );
};

const shareTextOnly = async (param: WebShareAPIParam): Promise<void> => {
  const shareOptions = {
    dialogTitle: param.title,
    subject: param.title,
  };

  if (Platform.OS === 'ios') {
    if (param.text) {
      await RNShare.share(
        {
          ...(param.title && { title: param.title }),
          message: param.text,
          ...(param.url && { url: param.url }),
        },
        shareOptions,
      );
    } else if (param.url) {
      await RNShare.share(
        {
          ...(param.title && { title: param.title }),
          url: param.url,
        },
        shareOptions,
      );
    }
    return;
  }

  await RNShare.share(
    {
      ...(param.title && { title: param.title }),
      message: buildShareMessage(param) ?? '',
    },
    shareOptions,
  );
};

const shareWithFiles = async (param: WebShareAPIParam): Promise<void> => {
  const primaryFile = param.files?.[0];
  if (!primaryFile) {
    return;
  }

  const tempPaths: string[] = [];

  try {
    const { path, mimeType, filename } = await writeShareFile(primaryFile);
    tempPaths.push(path);

    await Share.open({
      url: path,
      type: mimeType,
      filename,
      message: buildShareMessage(param),
      title: param.title,
      subject: param.title,
      failOnCancel: false,
    });
  } finally {
    await cleanupTempFiles(tempPaths);
  }
};

export async function handleWebShare(
  param: WebShareAPIParam | undefined,
): Promise<void> {
  if (
    param == null ||
    (param.url == null &&
      param.text == null &&
      (!param.files || param.files.length === 0))
  ) {
    return;
  }

  try {
    if (param.files && param.files.length > 0) {
      await shareWithFiles(param);
    } else {
      await shareTextOnly(param);
    }
  } catch (error: unknown) {
    Logger.error(error as Error, 'Browser::handleWebShare');
  }
}
