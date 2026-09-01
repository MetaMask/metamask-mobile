import StorageWrapper from '../../../../../../store/storage-wrapper';

export const WALLET_ASSISTANT_STORAGE_KEY =
  'wallet-assistant-conversation-state';
export const WALLET_ASSISTANT_STORAGE_VERSION = 1;
export const MAX_PERSISTED_MESSAGES = 50;

const MAX_TEXT_LENGTH = 12_000;
const MAX_TITLE_LENGTH = 300;
const MAX_COLLECTION_LENGTH = 20;
const MAX_URL_LENGTH = 2_048;
const REDACTED_ADDRESS = '[wallet address]';

const ADDRESS_PATTERNS = [
  /\b0x[a-fA-F0-9]{40}\b/g,
  /\b(?:bc1|tb1)[a-zA-HJ-NP-Z0-9]{25,90}\b/g,
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
];

export interface PersistedResearchSource {
  date: string;
  id: string;
  title: string;
  url: string;
}

export interface PersistedResearchEvidence {
  confidence: 'high' | 'medium' | 'low';
  sourceIds: string[];
}

export interface PersistedResearchSection {
  heading: string;
  bullets: string[];
  evidence?: PersistedResearchEvidence[];
}

export interface PersistedResearchChart {
  labels: string[];
  sourceIds: string[];
  title: string;
  unit: string;
  values: number[];
}

export interface PersistedSwapIntent {
  amountType: 'exact' | 'fiat' | 'percent' | 'unspecified';
  amountValue: string;
  enabled: boolean;
  mode: 'real';
  network: string;
  sourceAmount: string;
  sourceSymbol: string;
  destinationSymbol: string;
}

export interface PersistedResearchAsset {
  chainId: string;
  contractAddress: string;
  name: string;
  network: string;
  symbol: string;
}

export interface PersistedResearchResponse {
  asOf: string;
  assets: PersistedResearchAsset[];
  chart: PersistedResearchChart;
  sections: PersistedResearchSection[];
  sources: PersistedResearchSource[];
  summary: string;
  title: string;
  tokens: string[];
  swapIntent: PersistedSwapIntent;
}

export interface PersistedWalletAssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  research?: PersistedResearchResponse;
  text: string;
}

export interface WalletAssistantPersistenceState {
  messages: PersistedWalletAssistantMessage[];
  trackedQuoteRequestId?: string;
}

interface WalletAssistantStorageEnvelope
  extends WalletAssistantPersistenceState {
  version: typeof WALLET_ASSISTANT_STORAGE_VERSION;
}

export const EMPTY_WALLET_ASSISTANT_STATE: WalletAssistantPersistenceState = {
  messages: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactAddresses(value: string): string {
  return ADDRESS_PATTERNS.reduce(
    (redactedValue, pattern) =>
      redactedValue.replace(pattern, REDACTED_ADDRESS),
    value,
  );
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return redactAddresses(value).slice(0, maxLength);
}

function sanitizeStringArray(value: unknown, maxItemLength = MAX_TITLE_LENGTH) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_COLLECTION_LENGTH)
    .map((item) => sanitizeString(item, maxItemLength))
    .filter((item): item is string => item !== undefined);
}

function sanitizeSwapIntent(value: unknown): PersistedSwapIntent | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const amountType = value.amountType;
  const enabled = value.enabled;
  const isLegacyPaperTrade = value.mode === 'paper';
  const mode = value.mode === undefined ? 'real' : value.mode;
  const allowedAmountTypes = ['exact', 'fiat', 'percent', 'unspecified'];

  if (
    typeof amountType !== 'string' ||
    !allowedAmountTypes.includes(amountType) ||
    typeof enabled !== 'boolean' ||
    (mode !== 'paper' && mode !== 'real')
  ) {
    return undefined;
  }

  const amountValue = sanitizeString(value.amountValue, MAX_TITLE_LENGTH);
  const network = sanitizeString(value.network, MAX_TITLE_LENGTH);
  const sourceAmount = sanitizeString(value.sourceAmount, MAX_TITLE_LENGTH);
  const sourceSymbol = sanitizeString(value.sourceSymbol, MAX_TITLE_LENGTH);
  const destinationSymbol = sanitizeString(
    value.destinationSymbol,
    MAX_TITLE_LENGTH,
  );

  if (
    amountValue === undefined ||
    network === undefined ||
    sourceAmount === undefined ||
    sourceSymbol === undefined ||
    destinationSymbol === undefined
  ) {
    return undefined;
  }

  return {
    amountType: amountType as PersistedSwapIntent['amountType'],
    amountValue,
    enabled: isLegacyPaperTrade ? false : enabled,
    mode: 'real',
    network,
    sourceAmount,
    sourceSymbol,
    destinationSymbol,
  };
}

function sanitizeChart(value: unknown): PersistedResearchChart | undefined {
  if (!isRecord(value) || !Array.isArray(value.values)) {
    return undefined;
  }

  const title = sanitizeString(value.title, MAX_TITLE_LENGTH);
  const unit = sanitizeString(value.unit, MAX_TITLE_LENGTH);
  const values = value.values
    .slice(0, MAX_COLLECTION_LENGTH)
    .filter(
      (item): item is number =>
        typeof item === 'number' && Number.isFinite(item),
    );

  if (title === undefined || unit === undefined) {
    return undefined;
  }

  return {
    labels: sanitizeStringArray(value.labels),
    sourceIds: sanitizeStringArray(value.sourceIds),
    title,
    unit,
    values,
  };
}

function sanitizeEvidence(value: unknown): PersistedResearchEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_COLLECTION_LENGTH)
    .map((evidence) => {
      if (!isRecord(evidence)) {
        return undefined;
      }
      const confidence = evidence.confidence;
      if (
        confidence !== 'high' &&
        confidence !== 'medium' &&
        confidence !== 'low'
      ) {
        return undefined;
      }

      return {
        confidence,
        sourceIds: sanitizeStringArray(evidence.sourceIds),
      };
    })
    .filter(
      (evidence): evidence is PersistedResearchEvidence =>
        evidence !== undefined,
    );
}

function sanitizeSections(value: unknown): PersistedResearchSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_COLLECTION_LENGTH)
    .map((section) => {
      if (!isRecord(section)) {
        return undefined;
      }

      const heading = sanitizeString(section.heading, MAX_TITLE_LENGTH);
      if (heading === undefined) {
        return undefined;
      }

      return {
        heading,
        bullets: sanitizeStringArray(section.bullets, MAX_TEXT_LENGTH),
        ...(Array.isArray(section.evidence)
          ? { evidence: sanitizeEvidence(section.evidence) }
          : {}),
      };
    })
    .filter(
      (section): section is PersistedResearchSection => section !== undefined,
    );
}

function sanitizeSources(value: unknown): PersistedResearchSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_COLLECTION_LENGTH)
    .map((source, index) => {
      if (!isRecord(source)) {
        return undefined;
      }

      const date = sanitizeString(source.date, MAX_TITLE_LENGTH);
      const id =
        sanitizeString(source.id, MAX_TITLE_LENGTH) ?? `source-${index + 1}`;
      const title = sanitizeString(source.title, MAX_TITLE_LENGTH);
      const url = sanitizeString(source.url, MAX_URL_LENGTH);

      if (date === undefined || title === undefined || url === undefined) {
        return undefined;
      }

      return { date, id, title, url };
    })
    .filter(
      (source): source is PersistedResearchSource => source !== undefined,
    );
}

function sanitizeAssets(value: unknown): PersistedResearchAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_COLLECTION_LENGTH)
    .map((asset) => {
      if (!isRecord(asset)) {
        return undefined;
      }

      const chainId = sanitizeString(asset.chainId, MAX_TITLE_LENGTH);
      const contractAddress = sanitizeString(
        asset.contractAddress,
        MAX_TITLE_LENGTH,
      );
      const name = sanitizeString(asset.name, MAX_TITLE_LENGTH);
      const network = sanitizeString(asset.network, MAX_TITLE_LENGTH);
      const symbol = sanitizeString(asset.symbol, MAX_TITLE_LENGTH);
      if (
        chainId === undefined ||
        contractAddress === undefined ||
        name === undefined ||
        network === undefined ||
        symbol === undefined
      ) {
        return undefined;
      }

      return { chainId, contractAddress, name, network, symbol };
    })
    .filter((asset): asset is PersistedResearchAsset => asset !== undefined);
}

function sanitizeResearch(
  value: unknown,
): PersistedResearchResponse | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const chart = sanitizeChart(value.chart);
  const summary = sanitizeString(value.summary, MAX_TEXT_LENGTH);
  const title = sanitizeString(value.title, MAX_TITLE_LENGTH);
  const swapIntent = sanitizeSwapIntent(value.swapIntent);

  if (
    chart === undefined ||
    summary === undefined ||
    title === undefined ||
    swapIntent === undefined
  ) {
    return undefined;
  }

  return {
    asOf: sanitizeString(value.asOf, MAX_TITLE_LENGTH) ?? '',
    assets: sanitizeAssets(value.assets),
    chart,
    sections: sanitizeSections(value.sections),
    sources: sanitizeSources(value.sources),
    summary,
    title,
    tokens: sanitizeStringArray(value.tokens),
    swapIntent,
  };
}

function sanitizeMessage(
  value: unknown,
): PersistedWalletAssistantMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = sanitizeString(value.id, MAX_TITLE_LENGTH);
  const text = sanitizeString(value.text, MAX_TEXT_LENGTH);
  const role = value.role;

  if (
    id === undefined ||
    text === undefined ||
    (role !== 'assistant' && role !== 'user')
  ) {
    return undefined;
  }

  const research = sanitizeResearch(value.research);

  return {
    id,
    role,
    text,
    ...(research ? { research } : {}),
  };
}

export function normalizeWalletAssistantState(
  value: unknown,
): WalletAssistantPersistenceState {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    return EMPTY_WALLET_ASSISTANT_STATE;
  }

  const messages = value.messages
    .slice(-MAX_PERSISTED_MESSAGES)
    .map(sanitizeMessage)
    .filter(
      (message): message is PersistedWalletAssistantMessage =>
        message !== undefined,
    );
  const trackedQuoteRequestId = sanitizeString(
    value.trackedQuoteRequestId,
    MAX_TITLE_LENGTH,
  );

  return {
    messages,
    ...(trackedQuoteRequestId ? { trackedQuoteRequestId } : {}),
  };
}

export async function loadWalletAssistantState(): Promise<WalletAssistantPersistenceState> {
  try {
    const storedValue = await StorageWrapper.getItem(
      WALLET_ASSISTANT_STORAGE_KEY,
    );
    if (!storedValue) {
      return EMPTY_WALLET_ASSISTANT_STATE;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (
      !isRecord(parsedValue) ||
      parsedValue.version !== WALLET_ASSISTANT_STORAGE_VERSION
    ) {
      return EMPTY_WALLET_ASSISTANT_STATE;
    }

    return normalizeWalletAssistantState(parsedValue);
  } catch {
    return EMPTY_WALLET_ASSISTANT_STATE;
  }
}

export async function saveWalletAssistantState(
  state: WalletAssistantPersistenceState,
): Promise<void> {
  const normalizedState = normalizeWalletAssistantState(state);
  const envelope: WalletAssistantStorageEnvelope = {
    version: WALLET_ASSISTANT_STORAGE_VERSION,
    ...normalizedState,
  };

  await StorageWrapper.setItem(
    WALLET_ASSISTANT_STORAGE_KEY,
    JSON.stringify(envelope),
  );
}

export async function clearWalletAssistantState(): Promise<void> {
  await StorageWrapper.removeItem(WALLET_ASSISTANT_STORAGE_KEY);
}
