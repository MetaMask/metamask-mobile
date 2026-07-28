import { MalformedOpenAIResponseError } from './errorRecovery';

export type WalletAssistantAmountType =
  | 'exact'
  | 'fiat'
  | 'percent'
  | 'unspecified';

export interface WalletAssistantSwapIntent {
  amountType: WalletAssistantAmountType;
  amountValue: string;
  enabled: boolean;
  mode: 'real';
  network: string;
  sourceAmount: string;
  sourceSymbol: string;
  destinationSymbol: string;
}

export interface WalletAssistantResearchSource {
  date: string;
  id: string;
  title: string;
  url: string;
}

export type WalletAssistantResearchConfidence = 'high' | 'medium' | 'low';

export interface WalletAssistantResearchEvidence {
  confidence: WalletAssistantResearchConfidence;
  sourceIds: string[];
}

export interface WalletAssistantResearchSection {
  heading: string;
  bullets: string[];
  evidence?: WalletAssistantResearchEvidence[];
}

export interface WalletAssistantResearchChart {
  labels: string[];
  sourceIds: string[];
  title: string;
  unit: string;
  values: number[];
}

export interface WalletAssistantResearchAsset {
  chainId: string;
  contractAddress: string;
  name: string;
  network: string;
  symbol: string;
}

export interface WalletAssistantResearchResponse {
  asOf: string;
  assets: WalletAssistantResearchAsset[];
  chart: WalletAssistantResearchChart;
  sections: WalletAssistantResearchSection[];
  sources: WalletAssistantResearchSource[];
  summary: string;
  title: string;
  tokens: string[];
  swapIntent: WalletAssistantSwapIntent;
}

const LIMITS = {
  title: 160,
  summary: 1_200,
  sections: 8,
  sectionHeading: 120,
  bulletsPerSection: 8,
  bullet: 600,
  sources: 12,
  sourceTitle: 180,
  sourceDate: 32,
  sourceId: 64,
  sourceUrl: 2_048,
  chartPoints: 24,
  chartTitle: 120,
  chartUnit: 24,
  chartLabel: 48,
  tokens: 12,
  token: 16,
  intentValue: 64,
  intentNetwork: 64,
  assetName: 120,
  assetNetwork: 64,
  assetChainId: 96,
  assetContract: 160,
} as const;

const EMPTY_CHART: WalletAssistantResearchChart = {
  labels: [],
  sourceIds: [],
  title: '',
  unit: '',
  values: [],
};

const EMPTY_SWAP_INTENT: WalletAssistantSwapIntent = {
  amountType: 'unspecified',
  amountValue: '',
  enabled: false,
  mode: 'real',
  network: '',
  sourceAmount: '',
  sourceSymbol: '',
  destinationSymbol: '',
};

const TOKEN_SYMBOL = /^[A-Z0-9][A-Z0-9._-]*$/;
const AMOUNT_TYPES = new Set<WalletAssistantAmountType>([
  'exact',
  'fiat',
  'percent',
  'unspecified',
]);
const CONFIDENCE_LEVELS = new Set<WalletAssistantResearchConfidence>([
  'high',
  'medium',
  'low',
]);
const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stripControlCharacters = (value: string) =>
  [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return (
        code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 32 && code < 127) ||
        code > 127
      );
    })
    .join('');

const parseJsonObjectText = (value: string): unknown => {
  const trimmedValue = value.trim();

  try {
    return JSON.parse(trimmedValue);
  } catch {
    const fencedMatch =
      /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmedValue)?.[1];
    const candidate = fencedMatch ?? trimmedValue;
    const objectStart = candidate.indexOf('{');
    const objectEnd = candidate.lastIndexOf('}');

    if (objectStart === -1 || objectEnd <= objectStart) {
      throw new MalformedOpenAIResponseError();
    }

    try {
      return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
    } catch {
      throw new MalformedOpenAIResponseError();
    }
  }
};

const toBoundedString = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return '';
  }

  return stripControlCharacters(String(value)).trim().slice(0, maxLength);
};

const toTokenSymbol = (value: unknown): string => {
  const symbol = toBoundedString(value, LIMITS.token).toUpperCase();
  return TOKEN_SYMBOL.test(symbol) ? symbol : '';
};

const isSafePublicUrl = (value: string): boolean => {
  if (!value || value.length > LIMITS.sourceUrl) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
};

const parseSections = (value: unknown): WalletAssistantResearchSection[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, LIMITS.sections)
    .filter(isRecord)
    .map((section) => {
      const bullets = Array.isArray(section.bullets)
        ? section.bullets
            .slice(0, LIMITS.bulletsPerSection)
            .map((bullet) => toBoundedString(bullet, LIMITS.bullet))
            .filter(Boolean)
        : [];
      const evidence = Array.isArray(section.evidence)
        ? section.evidence
            .slice(0, bullets.length)
            .map((item): WalletAssistantResearchEvidence => {
              if (!isRecord(item)) {
                return { confidence: 'low', sourceIds: [] };
              }
              const confidence = toBoundedString(item.confidence, 16);
              const sourceIds = Array.isArray(item.sourceIds)
                ? [
                    ...new Set(
                      item.sourceIds
                        .map((sourceId) =>
                          toBoundedString(sourceId, LIMITS.sourceId),
                        )
                        .filter((sourceId) => SOURCE_ID.test(sourceId)),
                    ),
                  ].slice(0, LIMITS.sources)
                : [];

              return {
                confidence: CONFIDENCE_LEVELS.has(
                  confidence as WalletAssistantResearchConfidence,
                )
                  ? (confidence as WalletAssistantResearchConfidence)
                  : 'low',
                sourceIds,
              };
            })
        : [];

      return {
        heading: toBoundedString(section.heading, LIMITS.sectionHeading),
        bullets,
        ...(evidence.length ? { evidence } : {}),
      };
    })
    .filter((section) => section.heading || section.bullets.length);
};

const parseSources = (value: unknown): WalletAssistantResearchSource[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const sources: WalletAssistantResearchSource[] = [];

  for (const source of value) {
    if (!isRecord(source) || sources.length >= LIMITS.sources) {
      continue;
    }

    const url = toBoundedString(source.url, LIMITS.sourceUrl);
    if (!isSafePublicUrl(url) || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    const requestedId = toBoundedString(source.id, LIMITS.sourceId);
    let id =
      requestedId && SOURCE_ID.test(requestedId) && !seenIds.has(requestedId)
        ? requestedId
        : `source-${sources.length + 1}`;
    let fallbackIndex = sources.length + 1;
    while (seenIds.has(id)) {
      fallbackIndex += 1;
      id = `source-${fallbackIndex}`;
    }

    seenIds.add(id);
    sources.push({
      date: toBoundedString(source.date, LIMITS.sourceDate),
      id,
      title:
        toBoundedString(source.title, LIMITS.sourceTitle) ||
        new URL(url).hostname.replace(/^www\./, ''),
      url,
    });
  }

  return sources;
};

const parseChart = (value: unknown): WalletAssistantResearchChart => {
  if (!isRecord(value)) {
    return EMPTY_CHART;
  }

  if (
    !Array.isArray(value.labels) ||
    !Array.isArray(value.sourceIds) ||
    !Array.isArray(value.values)
  ) {
    return EMPTY_CHART;
  }

  const pointCount = Math.min(
    value.labels.length,
    value.sourceIds.length,
    value.values.length,
    LIMITS.chartPoints,
  );
  const labels = value.labels
    .slice(0, pointCount)
    .map((label) => toBoundedString(label, LIMITS.chartLabel));
  const values = value.values.slice(0, pointCount);
  const sourceIds = value.sourceIds
    .slice(0, pointCount)
    .map((sourceId) => toBoundedString(sourceId, LIMITS.sourceId));

  if (
    pointCount === 0 ||
    labels.some((label) => !label) ||
    sourceIds.some((sourceId) => !SOURCE_ID.test(sourceId)) ||
    values.some(
      (chartValue) =>
        typeof chartValue !== 'number' || !Number.isFinite(chartValue),
    )
  ) {
    return EMPTY_CHART;
  }

  return {
    labels,
    sourceIds,
    title: toBoundedString(value.title, LIMITS.chartTitle),
    unit: toBoundedString(value.unit, LIMITS.chartUnit),
    values: values as number[],
  };
};

const parseAssets = (value: unknown): WalletAssistantResearchAsset[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenAssets = new Set<string>();
  const assets: WalletAssistantResearchAsset[] = [];

  for (const asset of value) {
    if (!isRecord(asset) || assets.length >= LIMITS.tokens) {
      continue;
    }

    const symbol = toTokenSymbol(asset.symbol);
    const chainId = toBoundedString(asset.chainId, LIMITS.assetChainId);
    const contractAddress = toBoundedString(
      asset.contractAddress,
      LIMITS.assetContract,
    );
    const key = `${chainId}:${contractAddress}:${symbol}`.toLowerCase();
    if (!symbol || seenAssets.has(key)) {
      continue;
    }

    seenAssets.add(key);
    assets.push({
      chainId,
      contractAddress,
      name: toBoundedString(asset.name, LIMITS.assetName),
      network: toBoundedString(asset.network, LIMITS.assetNetwork),
      symbol,
    });
  }

  return assets;
};

const parseTokens = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.map(toTokenSymbol).filter(Boolean).slice(0, LIMITS.tokens),
    ),
  ];
};

const parseSwapIntent = (value: unknown): WalletAssistantSwapIntent => {
  if (!isRecord(value) || value.enabled !== true || value.mode === 'paper') {
    return { ...EMPTY_SWAP_INTENT };
  }

  const rawAmountType = toBoundedString(value.amountType, 16);
  const amountType = AMOUNT_TYPES.has(
    rawAmountType as WalletAssistantAmountType,
  )
    ? (rawAmountType as WalletAssistantAmountType)
    : 'unspecified';
  const amountValue = toBoundedString(value.amountValue, LIMITS.intentValue);

  return {
    amountType,
    amountValue,
    enabled: true,
    mode: 'real',
    network: toBoundedString(value.network, LIMITS.intentNetwork),
    sourceAmount:
      amountType === 'exact'
        ? toBoundedString(value.sourceAmount ?? amountValue, LIMITS.intentValue)
        : '',
    sourceSymbol: toTokenSymbol(value.sourceSymbol),
    destinationSymbol: toTokenSymbol(value.destinationSymbol),
  };
};

/**
 * Converts an untrusted OpenAI JSON response into the bounded shape rendered by
 * Wallet Assistant. Parsing failures never retain or expose the raw response.
 */
export const parseWalletAssistantResearchResponse = (
  input: unknown,
): WalletAssistantResearchResponse => {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    parsed = parseJsonObjectText(input);
  }

  if (!isRecord(parsed)) {
    throw new MalformedOpenAIResponseError();
  }

  const sources = parseSources(parsed.sources);
  const sourceIds = new Set(sources.map((source) => source.id));
  const sections = parseSections(parsed.sections).map((section) => ({
    ...section,
    ...(section.evidence
      ? {
          evidence: section.evidence.map((evidence) => ({
            ...evidence,
            sourceIds: evidence.sourceIds.filter((sourceId) =>
              sourceIds.has(sourceId),
            ),
          })),
        }
      : {}),
  }));
  const chart = parseChart(parsed.chart);
  const isChartSourceBacked = chart.sourceIds.every((sourceId) =>
    sourceIds.has(sourceId),
  );

  return {
    asOf: toBoundedString(parsed.asOf, LIMITS.sourceDate),
    assets: parseAssets(parsed.assets),
    chart: isChartSourceBacked ? chart : EMPTY_CHART,
    sections,
    sources,
    summary: toBoundedString(parsed.summary, LIMITS.summary),
    title: toBoundedString(parsed.title, LIMITS.title) || 'Market update',
    tokens: parseTokens(parsed.tokens),
    swapIntent: parseSwapIntent(parsed.swapIntent),
  };
};
