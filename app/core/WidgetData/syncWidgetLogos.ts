import RNFS from 'react-native-fs';
import Logger from '../../util/Logger';
import { WidgetBridge } from '../NativeModules';
import { WidgetTokenEntry, WidgetTokenPayload } from './buildWidgetPayload';

/**
 * The final per-token shape written to the widget: like {@link WidgetTokenEntry}
 * but with the transient remote `logoUrl` replaced by a locally-cached
 * `logoFile` (resolved by the widget against the App Group logos directory).
 */
export type WidgetTokenOutput = Omit<WidgetTokenEntry, 'logoUrl'> & {
  /** Filename (relative to the App Group logos dir) of the cached PNG logo. */
  logoFile?: string;
};

export interface WidgetSyncPayload {
  tokens: WidgetTokenOutput[];
}

// The logos dir path never changes for an install; resolve it once and cache it.
let logosDirPromise: Promise<string> | null = null;

function getLogosDir(): Promise<string> {
  if (!logosDirPromise) {
    logosDirPromise = WidgetBridge.getLogosDirectoryPath();
  }
  return logosDirPromise;
}

/** Strip non-alphanumerics so the symbol is a safe PNG filename. */
function logoFileName(symbol: string): string {
  const cleaned = symbol.replace(/[^a-zA-Z0-9]/g, '_');
  return `${cleaned || 'token'}.png`;
}

function stripLogoUrl(token: WidgetTokenEntry): WidgetTokenOutput {
  const { logoUrl: _logoUrl, ...rest } = token;
  return rest;
}

/**
 * Downloads a token logo into the App Group container, skipping URLs that are
 * empty, non-http(s), SVG (SwiftUI can't render SVG), or already cached on disk.
 * Returns the relative filename on success, or `undefined` on any failure — the
 * widget renders a monogram fallback when a logo is absent.
 */
async function cacheLogo(
  logoUrl: string,
  symbol: string,
  logosDir: string,
): Promise<string | undefined> {
  if (
    !logoUrl ||
    !/^https?:\/\//i.test(logoUrl) ||
    /\.svg(\?|$)/i.test(logoUrl)
  ) {
    return undefined;
  }

  const fileName = logoFileName(symbol);
  const toFile = `${logosDir}/${fileName}`;

  try {
    // Logos rarely change; skip the download when the file already exists.
    if (await RNFS.exists(toFile)) {
      return fileName;
    }
    const { statusCode } = await RNFS.downloadFile({ fromUrl: logoUrl, toFile })
      .promise;
    if (statusCode >= 200 && statusCode < 300) {
      return fileName;
    }
    // Partial/failed downloads can leave a stub file behind; remove it so the
    // next sync retries cleanly.
    await RNFS.unlink(toFile).catch(() => undefined);
    return undefined;
  } catch {
    // Network blips are expected and non-fatal; fall back to the monogram.
    return undefined;
  }
}

/**
 * Replaces each entry's remote `logoUrl` with a locally-cached `logoFile`,
 * downloading the logos into the App Group container that the widget reads from.
 * If the shared container is unavailable, returns the payload without logos
 * rather than failing the whole sync.
 */
export async function syncWidgetLogos(
  payload: WidgetTokenPayload,
): Promise<WidgetSyncPayload> {
  let logosDir: string;
  try {
    logosDir = await getLogosDir();
  } catch (error) {
    logosDirPromise = null; // allow a later retry
    Logger.error(error as Error, 'syncWidgetLogos: logos dir unavailable');
    return { tokens: payload.tokens.map(stripLogoUrl) };
  }

  const tokens = await Promise.all(
    payload.tokens.map(async (token) => {
      const logoFile = await cacheLogo(token.logoUrl, token.symbol, logosDir);
      const output = stripLogoUrl(token);
      return logoFile ? { ...output, logoFile } : output;
    }),
  );

  return { tokens };
}
