import { isDirectTradeRequest } from './tradeIntentPriority';
import type { WalletAssistantResearchResponse } from './openai';

export type WalletAssistantResearchIntent =
  | 'comparison'
  | 'discovery'
  | 'general'
  | 'market_movement'
  | 'price_snapshot'
  | 'project_overview'
  | 'risk'
  | 'trade';

export interface WalletAssistantNetworkHint {
  caipChainId: string;
  name: string;
}

export interface WalletAssistantAssetHint {
  contractAddress: string;
  network?: WalletAssistantNetworkHint;
  symbol: string;
}

export interface WalletAssistantResearchPlan {
  assetHints: WalletAssistantAssetHint[];
  intent: WalletAssistantResearchIntent;
  network?: WalletAssistantNetworkHint;
  searchContextSize: 'low' | 'medium';
  useWebSearch: boolean;
}

const NETWORKS: readonly (WalletAssistantNetworkHint & {
  pattern: RegExp;
})[] = [
  {
    caipChainId: 'eip155:4663',
    name: 'Robinhood Chain',
    pattern: /\brobinhood\s+chain\b/i,
  },
  {
    caipChainId: 'eip155:42161',
    name: 'Arbitrum',
    pattern: /\barbitrum\b/i,
  },
  {
    caipChainId: 'eip155:43114',
    name: 'Avalanche',
    pattern: /\bavalanche\b|\bavax\s+(?:chain|network)\b/i,
  },
  {
    caipChainId: 'eip155:56',
    name: 'BNB Chain',
    pattern: /\bbnb\s+chain\b|\bbinance\s+smart\s+chain\b|\bbsc\b/i,
  },
  {
    caipChainId: 'eip155:8453',
    name: 'Base',
    pattern: /\bbase\s+(?:chain|network)\b|\bon\s+base\b/i,
  },
  {
    caipChainId: 'eip155:59144',
    name: 'Linea',
    pattern: /\blinea\b/i,
  },
  {
    caipChainId: 'eip155:10',
    name: 'Optimism',
    pattern: /\boptimism\b|\bop\s+mainnet\b/i,
  },
  {
    caipChainId: 'eip155:137',
    name: 'Polygon',
    pattern: /\bpolygon\b|\bpolygon\s+pos\b/i,
  },
  {
    caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    pattern: /\bsolana\b/i,
  },
  {
    caipChainId: 'eip155:1',
    name: 'Ethereum',
    pattern: /\bethereum\s+(?:mainnet|network|chain)\b|\bon\s+ethereum\b/i,
  },
];

const COMMON_ASSET_NAMES: Readonly<Record<string, string>> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  ether: 'ETH',
  solana: 'SOL',
  tether: 'USDT',
  'usd coin': 'USDC',
};

const SYMBOL_STOP_WORDS = new Set([
  'AI',
  'API',
  'APR',
  'ATH',
  'BUY',
  'COMPARE',
  'DAO',
  'DEX',
  'ETF',
  'EVM',
  'FDV',
  'L1',
  'L2',
  'MARKET',
  'NFT',
  'PRICE',
  'RISK',
  'SELL',
  'SWAP',
  'TVL',
  'USD',
  'VOLUME',
]);

const CONTRACT_PATTERN = /\b0x[a-fA-F0-9]{40}\b/;
const EXPLICIT_SYMBOL_PATTERN = /\$([A-Za-z][A-Za-z0-9._-]{1,15})\b/g;
const UPPERCASE_SYMBOL_PATTERN = /\b[A-Z][A-Z0-9._-]{1,9}\b/g;

const getResearchIntent = (prompt: string): WalletAssistantResearchIntent => {
  if (isDirectTradeRequest(prompt)) {
    return 'trade';
  }
  if (
    /\b(compare|versus|vs\.?|better than|difference between)\b/i.test(prompt)
  ) {
    return 'comparison';
  }
  if (
    /\b(trending|popular|rank|ranking|gainers?|losers?|discover|find me|under \$?\d+.*market cap)\b/i.test(
      prompt,
    )
  ) {
    return 'discovery';
  }
  if (
    /\b(risk|risky|safe|scam|honeypot|rug|liquidity|holders?|concentration|audit|security)\b/i.test(
      prompt,
    )
  ) {
    return 'risk';
  }
  if (
    /\b(why|moved?|moving|up|down|rall(?:y|ied)|drop(?:ped)?|pump(?:ed)?|news|catalyst|driver)\b/i.test(
      prompt,
    )
  ) {
    return 'market_movement';
  }
  if (
    /\b(price|quote|market cap|volume|performance|change|chart|current|today|latest)\b/i.test(
      prompt,
    )
  ) {
    return 'price_snapshot';
  }
  if (
    /\b(research|explain|tell me about|what is|overview|project|protocol|token)\b/i.test(
      prompt,
    )
  ) {
    return 'project_overview';
  }
  return 'general';
};

const getNetworkHint = (
  prompt: string,
): WalletAssistantNetworkHint | undefined => {
  const network = NETWORKS.find(({ pattern }) => pattern.test(prompt));
  return network
    ? { caipChainId: network.caipChainId, name: network.name }
    : undefined;
};

const getAssetSymbols = (prompt: string): string[] => {
  const symbols = new Set<string>();

  for (const match of prompt.matchAll(EXPLICIT_SYMBOL_PATTERN)) {
    symbols.add(match[1].toUpperCase());
  }
  for (const match of prompt.matchAll(UPPERCASE_SYMBOL_PATTERN)) {
    const symbol = match[0].toUpperCase();
    if (!SYMBOL_STOP_WORDS.has(symbol)) {
      symbols.add(symbol);
    }
  }
  const normalizedPrompt = prompt.toLowerCase();
  for (const [name, symbol] of Object.entries(COMMON_ASSET_NAMES)) {
    if (new RegExp(`\\b${name.replace(' ', '\\s+')}\\b`, 'i').test(prompt)) {
      symbols.add(symbol);
    }
  }

  if (normalizedPrompt.includes('cashcat')) {
    symbols.add('CASHCAT');
  }

  return [...symbols].slice(0, 6);
};

export const buildResearchPlan = (
  prompt: string,
): WalletAssistantResearchPlan => {
  const intent = getResearchIntent(prompt);
  const network = getNetworkHint(prompt);
  const contractAddress = prompt.match(CONTRACT_PATTERN)?.[0] ?? '';
  const assetHints = getAssetSymbols(prompt).map((symbol) => ({
    contractAddress,
    ...(network ? { network } : {}),
    symbol,
  }));
  const useWebSearch = !['general', 'trade'].includes(intent);
  const searchContextSize = [
    'comparison',
    'discovery',
    'market_movement',
    'risk',
  ].includes(intent)
    ? 'medium'
    : 'low';

  return {
    assetHints,
    intent,
    ...(network ? { network } : {}),
    searchContextSize,
    useWebSearch,
  };
};

export const getResearchPlanInstructions = (
  plan: WalletAssistantResearchPlan,
): string => {
  const assetContext = plan.assetHints.length
    ? `Asset hints: ${plan.assetHints
        .map(({ contractAddress, symbol }) =>
          contractAddress ? `${symbol} at ${contractAddress}` : symbol,
        )
        .join(', ')}.`
    : 'No unambiguous asset symbol was provided.';
  const networkContext = plan.network
    ? `Network constraint: ${plan.network.name} (${plan.network.caipChainId}). Only include assets deployed on this network.`
    : 'No network was explicitly selected. Do not invent one.';

  return `
Research plan:
- Intent: ${plan.intent}.
- ${networkContext}
- ${assetContext}
- Resolve assets by network and contract address before using a ticker. A ticker alone is not proof of identity.
- Use current structured market data for numeric claims and web sources for news, project context, and explanations.
- Every factual bullet must cite one or more source IDs. Use low confidence when sources conflict or identity is incomplete.
- Every chart point must include the source ID that supports that exact value.
- If the network, contract, or token identity cannot be verified, state that clearly instead of substituting a similarly named asset.
`.trim();
};

/**
 * Applies deterministic identity constraints after the model response is
 * parsed. Explicit network and contract details from the user's request take
 * precedence over model-inferred identity.
 */
export const applyResearchPlanIdentity = (
  plan: WalletAssistantResearchPlan,
  research: WalletAssistantResearchResponse,
): WalletAssistantResearchResponse => {
  if (plan.assetHints.length === 0 && !plan.network) {
    return research;
  }

  const hintsBySymbol = new Map(
    plan.assetHints.map((hint) => [hint.symbol.toUpperCase(), hint]),
  );
  const constrainedAssets = research.assets
    .filter(
      (asset) =>
        !plan.network ||
        !asset.chainId ||
        asset.chainId === plan.network.caipChainId,
    )
    .map((asset) => {
      const hint = hintsBySymbol.get(asset.symbol.toUpperCase());
      return {
        ...asset,
        chainId:
          hint?.network?.caipChainId ??
          plan.network?.caipChainId ??
          asset.chainId,
        contractAddress: hint?.contractAddress || asset.contractAddress,
        network: hint?.network?.name ?? plan.network?.name ?? asset.network,
      };
    });
  const existingSymbols = new Set(
    constrainedAssets.map((asset) => asset.symbol.toUpperCase()),
  );

  for (const hint of plan.assetHints) {
    if (existingSymbols.has(hint.symbol)) {
      continue;
    }
    existingSymbols.add(hint.symbol);
    constrainedAssets.push({
      chainId: hint.network?.caipChainId ?? '',
      contractAddress: hint.contractAddress,
      name: '',
      network: hint.network?.name ?? '',
      symbol: hint.symbol,
    });
  }
  if (plan.network) {
    for (const symbol of research.tokens) {
      const normalizedSymbol = symbol.toUpperCase();
      if (existingSymbols.has(normalizedSymbol)) {
        continue;
      }
      existingSymbols.add(normalizedSymbol);
      constrainedAssets.push({
        chainId: plan.network.caipChainId,
        contractAddress: '',
        name: '',
        network: plan.network.name,
        symbol: normalizedSymbol,
      });
    }
  }

  return {
    ...research,
    assets: constrainedAssets,
  };
};
