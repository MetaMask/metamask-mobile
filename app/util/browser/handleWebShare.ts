import { InteractionManager, Platform, Share as RNShare } from 'react-native';
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

const getExtensionFromMime = (mimeType: string): string =>
  MIME_TO_EXTENSION[mimeType.toLowerCase()] ?? 'bin';

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);

const resolveFilename = (rawName: string, mimeType: string): string => {
  const sanitized = sanitizeFilename(rawName);
  if (sanitized && sanitized.includes('.')) {
    return sanitized;
  }
  return `${sanitized || 'share'}.${getExtensionFromMime(mimeType)}`;
};

const toDataUrl = (
  file: WebShareFilePayload,
): { url: string; mimeType: string } => {
  if (file.data.startsWith('data:')) {
    const match = /^data:([^;,]+)/.exec(file.data);
    return {
      url: file.data,
      mimeType: file.type || match?.[1] || 'application/octet-stream',
    };
  }

  const mimeType = file.type || 'application/octet-stream';
  return { url: `data:${mimeType};base64,${file.data}`, mimeType };
};

const buildShareMessage = (param: WebShareAPIParam): string | undefined => {
  const message = [param.text, param.url].filter(Boolean).join(' ');
  return message || undefined;
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

  const { url, mimeType } = toDataUrl(primaryFile);
  const filename = resolveFilename(primaryFile.name, mimeType);

  // react-native-share decodes data URLs and writes a temp file natively
  // (ShareFile.java), then exposes it via FileProvider for the share intent.
  await Share.open({
    url,
    type: mimeType,
    filename,
    message: buildShareMessage(param),
    title: param.title,
    subject: param.title,
    failOnCancel: false,
    ...(Platform.OS === 'android' && { useInternalStorage: true }),
  });
};

const runAfterInteractions = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });

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
    // The share sheet is launched from the WebView message handler; defer to
    // avoid contending with in-flight touch/gesture interactions on Android.
    if (Platform.OS === 'android') {
      await runAfterInteractions();
    }

    if (param.files && param.files.length > 0) {
      await shareWithFiles(param);
    } else {
      await shareTextOnly(param);
    }
  } catch (error: unknown) {
    Logger.error(error as Error, 'Browser::handleWebShare');
  }
}
