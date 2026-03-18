/**
 * Fetch perp annotations from Hyperliquid API for display labels.
 *
 * Hyperliquid exposes perpConciseAnnotations (bulk) and perpAnnotation (per coin).
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
 */

const INFO_PATH = '/info';

/** Descriptions that are not suitable as market display labels. */
const GENERIC_PERP_ANNOTATION_DESCRIPTIONS = new Set([
  'other perps',
  'other',
]);

type PerpConciseAnnotation = {
  category?: string;
  description?: string;
  displayName?: string;
  keywords?: string[];
  [key: string]: unknown;
};

type PerpConciseAnnotationsResponse = Array<[string, PerpConciseAnnotation]>;

type PerpAnnotationResponse = {
  category?: string;
  description?: string;
  [key: string]: unknown;
};

function getInfoBaseUrl(isTestnet: boolean): string {
  return isTestnet
    ? 'https://api.hyperliquid-testnet.xyz'
    : 'https://api.hyperliquid.xyz';
}

function displayLabelFromConciseAnnotation(
  annotation: PerpConciseAnnotation | undefined,
): string | undefined {
  if (!annotation) return undefined;
  const displayLabel =
    annotation.displayName ??
    annotation.description ??
    (Array.isArray(annotation.keywords) && annotation.keywords[0]
      ? String(annotation.keywords[0])
      : undefined);
  return displayLabel && typeof displayLabel === 'string'
    ? displayLabel.trim() || undefined
    : undefined;
}

function isUsablePerpAnnotationDescription(description: string): boolean {
  const normalized = description.trim().toLowerCase();
  if (!normalized) return false;
  return !GENERIC_PERP_ANNOTATION_DESCRIPTIONS.has(normalized);
}

/**
 * Fetch perpConciseAnnotations and build a symbol → display label map (no fallbacks).
 */
async function fetchPerpConciseAnnotationsBulk(options: {
  isTestnet: boolean;
  timeout?: number;
}): Promise<Map<string, string>> {
  const { isTestnet, timeout = 10_000 } = options;
  const url = `${getInfoBaseUrl(isTestnet)}${INFO_PATH}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'perpConciseAnnotations' }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `perpConciseAnnotations failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as PerpConciseAnnotationsResponse;
    const map = new Map<string, string>();

    if (!Array.isArray(data)) {
      return map;
    }

    for (const entry of data) {
      if (!Array.isArray(entry) || entry.length < 2) continue;

      const [symbol, annotation] = entry as [string, PerpConciseAnnotation];
      if (!symbol || typeof symbol !== 'string') continue;

      const displayLabel = displayLabelFromConciseAnnotation(annotation);
      if (displayLabel) {
        map.set(symbol, displayLabel);
      }
    }

    return map;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function mergeDisplaySymbolFallbacks(map: Map<string, string>): void {
  for (const [sym, label] of Object.entries(PERP_DISPLAY_SYMBOL_FALLBACKS)) {
    if (!map.has(sym)) {
      map.set(sym, label);
    }
  }
}

/**
 * Fetch perpConciseAnnotations from Hyperliquid Info API.
 * Returns a map of symbol → display label for UI rendering.
 * Merges {@link PERP_DISPLAY_SYMBOL_FALLBACKS} for symbols missing from the API.
 */
export async function fetchPerpConciseAnnotations(options: {
  isTestnet: boolean;
  timeout?: number;
}): Promise<Map<string, string>> {
  const map = await fetchPerpConciseAnnotationsBulk(options);
  mergeDisplaySymbolFallbacks(map);
  return map;
}

/**
 * Fetch a single coin's perpAnnotation from Hyperliquid Info API.
 *
 * @returns Display label from `description` when usable, otherwise `null`.
 */
export async function fetchPerpAnnotation(options: {
  coin: string;
  isTestnet: boolean;
  timeout?: number;
}): Promise<{ displayLabel?: string } | null> {
  const { coin, isTestnet, timeout = 10_000 } = options;
  if (!coin || typeof coin !== 'string') {
    return null;
  }

  const url = `${getInfoBaseUrl(isTestnet)}${INFO_PATH}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'perpAnnotation', coin }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as PerpAnnotationResponse;
    if (!data || typeof data !== 'object') {
      return null;
    }

    const description =
      typeof data.description === 'string' ? data.description.trim() : '';
    if (!description || !isUsablePerpAnnotationDescription(description)) {
      return null;
    }

    return { displayLabel: description };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

const DEFAULT_PERP_ANNOTATION_CONCURRENCY = 20;

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, concurrency);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (index < items.length) {
        const i = index;
        index += 1;
        await fn(items[i]);
      }
    })(),
  );

  await Promise.all(workers);
}

/**
 * Builds a symbol → display label map using perpConciseAnnotations, then
 * perpAnnotation for HIP-3 symbols still missing a label, then static fallbacks.
 *
 * On bulk fetch failure, returns a map containing only fallbacks (never throws).
 */
export async function fetchPerpAnnotationsMap(options: {
  isTestnet: boolean;
  universeSymbols: readonly string[];
  timeout?: number;
  perpAnnotationConcurrency?: number;
}): Promise<Map<string, string>> {
  const {
    isTestnet,
    universeSymbols,
    timeout = 10_000,
    perpAnnotationConcurrency = DEFAULT_PERP_ANNOTATION_CONCURRENCY,
  } = options;

  let map: Map<string, string>;
  try {
    map = await fetchPerpConciseAnnotationsBulk({ isTestnet, timeout });
  } catch {
    map = new Map();
  }

  const unique = [...new Set(universeSymbols.filter(Boolean))];
  const hip3MissingLabels = unique.filter(
    (sym) => typeof sym === 'string' && sym.includes(':') && !map.has(sym),
  );

  await runWithConcurrency(hip3MissingLabels, perpAnnotationConcurrency, async (coin) => {
    const result = await fetchPerpAnnotation({ coin, isTestnet, timeout });
    if (result?.displayLabel) {
      map.set(coin, result.displayLabel);
    }
  });

  mergeDisplaySymbolFallbacks(map);
  return map;
}

/**
 * Known symbol → display label mappings when APIs do not provide them.
 */
export const PERP_DISPLAY_SYMBOL_FALLBACKS: Record<string, string> = {
  'xyz:CL': 'WTICRUDE',
  'xyz:CLUSD': 'WTICRUDE',
};
