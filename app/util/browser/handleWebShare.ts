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
  /** Correlation id used to settle the page-side navigator.share() promise. */
  id?: string;
  url?: string;
  text?: string;
  title?: string;
  files?: WebShareFilePayload[];
}

/**
 * Outcome of a native share, reported back to the WebView so a polyfilled
 * `navigator.share()` promise can resolve (success) or reject (cancel/error)
 * like the real Web Share API instead of always resolving.
 */
export type WebShareStatus = 'success' | 'cancelled' | 'error';

export interface WebShareResult {
  status: WebShareStatus;
  message?: string;
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

/**
 * `Share.share` (React Native core) resolves with `dismissedAction` when the
 * user cancels on iOS; Android cannot report cancellation, so it always resolves
 * as `sharedAction`. Map that to a Web Share result.
 */
const interpretRNShareResult = (result: { action: string }): WebShareResult =>
  result.action === RNShare.dismissedAction
    ? { status: 'cancelled' }
    : { status: 'success' };

const shareTextOnly = async (
  param: WebShareAPIParam,
): Promise<WebShareResult> => {
  const shareOptions = {
    dialogTitle: param.title,
    subject: param.title,
  };

  if (Platform.OS === 'ios') {
    if (param.text) {
      const result = await RNShare.share(
        {
          ...(param.title && { title: param.title }),
          message: param.text,
          ...(param.url && { url: param.url }),
        },
        shareOptions,
      );
      return interpretRNShareResult(result);
    }
    if (param.url) {
      const result = await RNShare.share(
        {
          ...(param.title && { title: param.title }),
          url: param.url,
        },
        shareOptions,
      );
      return interpretRNShareResult(result);
    }
    return { status: 'success' };
  }

  const result = await RNShare.share(
    {
      ...(param.title && { title: param.title }),
      message: buildShareMessage(param) ?? '',
    },
    shareOptions,
  );
  return interpretRNShareResult(result);
};

// failOnCancel:false makes cancellation resolve (with success:false /
// dismissedAction) instead of throwing, so the outcome is read from the result.
const interpretShareOpenResult = (result: {
  success?: boolean;
  dismissedAction?: boolean;
}): WebShareResult =>
  result?.dismissedAction || result?.success === false
    ? { status: 'cancelled' }
    : { status: 'success' };

const shareWithFiles = async (
  param: WebShareAPIParam,
): Promise<WebShareResult> => {
  const files = param.files ?? [];
  if (files.length === 0) {
    return { status: 'error', message: 'No file to share' };
  }

  const encodedFiles = files.map((file) => {
    const { url, mimeType } = toDataUrl(file);
    return { url, mimeType, filename: resolveFilename(file.name, mimeType) };
  });

  const message = buildShareMessage(param);

  // react-native-share decodes data URLs and writes temp files natively
  // (ShareFile/ShareFiles.java), then exposes them via FileProvider for the
  // share intent.
  if (encodedFiles.length === 1) {
    const [file] = encodedFiles;
    const result = await Share.open({
      url: file.url,
      type: file.mimeType,
      filename: file.filename,
      message,
      title: param.title,
      subject: param.title,
      failOnCancel: false,
      ...(Platform.OS === 'android' && { useInternalStorage: true }),
    });
    return interpretShareOpenResult(result);
  }

  // Multiple files must go through the plural `urls`/`filenames` arrays so the
  // native side uses ACTION_SEND_MULTIPLE and derives a combined MIME type from
  // the individual data URLs.
  const result = await Share.open({
    urls: encodedFiles.map((file) => file.url),
    filenames: encodedFiles.map((file) => file.filename),
    message,
    title: param.title,
    subject: param.title,
    failOnCancel: false,
    ...(Platform.OS === 'android' && { useInternalStorage: true }),
  });
  return interpretShareOpenResult(result);
};

const runAfterInteractions = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });

/** Avoid blocking forever when InteractionManager never idles (e.g. active WebView). */
const runAfterInteractionsOrTimeout = (timeoutMs = 500): Promise<void> =>
  Promise.race([
    runAfterInteractions(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);

export async function handleWebShare(
  param: WebShareAPIParam | undefined,
): Promise<WebShareResult> {
  if (
    param == null ||
    (param.url == null &&
      param.text == null &&
      (!param.files || param.files.length === 0))
  ) {
    return { status: 'error', message: 'Nothing to share' };
  }

  try {
    // The share sheet is launched from the WebView message handler; defer to
    // avoid contending with in-flight touch/gesture interactions on Android.
    // Guard with a timeout so an active WebView (scrolling/animation) that
    // never lets InteractionManager idle can't hang the share flow forever.
    if (Platform.OS === 'android') {
      await runAfterInteractionsOrTimeout();
    }

    if (param.files && param.files.length > 0) {
      return await shareWithFiles(param);
    }
    return await shareTextOnly(param);
  } catch (error: unknown) {
    Logger.error(error as Error, 'Browser::handleWebShare');
    return { status: 'error', message: (error as Error)?.message };
  }
}
