import type {
  WalletAssistantResearchResponse,
  WalletAssistantSwapIntent,
} from './openai';

const DIRECT_TRADE_REQUEST =
  /(?:\b(?:can|could|may)\s+i\s+(?:buy|purchase|sell|swap|trade|convert|exchange)\b|^\s*(?:please\s+|let'?s\s+|help me\s+|i\s+(?:want|need|would like)\s+to\s+)?(?:buy|purchase|sell|swap|trade|convert|exchange)\b|\bhow\s+(?:can|do)\s+i\s+(?:buy|purchase|sell|swap|trade|convert|exchange)\b|\b(?:paper|fake|simulated)\s+trade\s*:?\s*(?:buy|purchase|sell|swap|trade|convert|exchange)\b)/i;
const ADVICE_REQUEST =
  /\b(?:should|would)\s+i\s+(?:buy|purchase|sell|trade)\b|\bwhy\s+(?:buy|purchase|sell)\b/i;
const PAPER_TRADE_REQUEST = /\b(?:paper|fake|simulated|simulation)\b/i;
const TRADE_ACTION = /\b(buy|purchase|sell|swap|trade|convert|exchange)\b/i;
const SYMBOL_AFTER_ACTION =
  /\b(?:buy|purchase|sell|swap|trade|convert|exchange)\s+(?:(?:some|any|more)\s+)?([a-z0-9][a-z0-9._-]{1,15})\b/i;
const DESTINATION_AFTER_CONNECTOR =
  /\b(?:to|for|into)\s+([a-z0-9][a-z0-9._-]{1,15})\b/i;
const BUY_DESTINATION =
  /\b(?:buy|purchase)\s+(?:(?:\$\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s+(?:(?:worth\s+)?of\s+)?)?([a-z0-9][a-z0-9._-]{1,15})\b/i;
const BUY_SOURCE =
  /\b(?:with|using|for)\s+(?:(\d+(?:\.\d+)?)\s+)?([a-z0-9][a-z0-9._-]{1,15})\b/i;
const SOURCE_AFTER_ACTION =
  /\b(?:sell|swap|trade|convert|exchange)\s+(?:(?:\d+(?:\.\d+)?%?|half|all)\s+(?:of\s+(?:my\s+)?)?)?([a-z0-9][a-z0-9._-]{1,15})\b/i;
const EXACT_SOURCE_AMOUNT =
  /\b(?:sell|swap|trade|convert|exchange)\s+(\d+(?:\.\d+)?)\s+([a-z0-9][a-z0-9._-]{1,15})\b/i;
const PERCENT_AMOUNT = /\b(\d+(?:\.\d+)?)\s*%/;
const PAY_WITH_SYMBOL = /\b(?:pay\s+with|use)\s+([a-z0-9][a-z0-9._-]{1,15})\b/i;
const MAKE_IT_FIAT =
  /\b(?:make\s+it|change(?:\s+it)?\s+to)\s+\$\s*(\d+(?:\.\d+)?)/i;
const EXPLICIT_NETWORK_FOLLOW_UP =
  /^\s*(?:(?:on|over|via|use)\s+(?:robinhood\s+chain|ethereum(?:\s+mainnet)?|mainnet|arbitrum|optimism|polygon|base|bnb(?:\s+smart\s+chain)?|bsc|avalanche|linea|solana)|switch(?:\s+it)?\s+to\s+(?:robinhood\s+chain|ethereum(?:\s+mainnet)?|mainnet|arbitrum|optimism|polygon|base|bnb(?:\s+smart\s+chain)?|bsc|avalanche|linea|solana))\s*(?:please|instead)?[.!]?\s*$/i;
const NETWORK_ALIASES: readonly (readonly [RegExp, string])[] = [
  [/\brobinhood\s+chain\b/i, 'Robinhood Chain'],
  [/\bethereum(?:\s+mainnet)?\b|\bmainnet\b/i, 'Ethereum'],
  [/\barbitrum\b/i, 'Arbitrum'],
  [/\boptimism\b/i, 'Optimism'],
  [/\bpolygon\b/i, 'Polygon'],
  [/\bbase\b/i, 'Base'],
  [/\bbnb(?:\s+smart\s+chain)?\b|\bbsc\b/i, 'BNB Smart Chain'],
  [/\bavalanche\b/i, 'Avalanche'],
  [/\blinea\b/i, 'Linea'],
  [/\bsolana\b/i, 'Solana'],
];
const TOKEN_SYMBOL = /^[A-Z0-9][A-Z0-9._-]{1,15}$/;
const NON_TOKEN_WORDS = new Set([
  'A',
  'AN',
  'CRYPTO',
  'SOME',
  'TOKEN',
  'TOKENS',
]);

export const isDirectTradeRequest = (prompt: string) =>
  DIRECT_TRADE_REQUEST.test(prompt) &&
  !ADVICE_REQUEST.test(prompt) &&
  !PAPER_TRADE_REQUEST.test(prompt);

const toTokenSymbol = (value: string | undefined) => {
  const symbol = value?.trim().toUpperCase() ?? '';
  return TOKEN_SYMBOL.test(symbol) && !NON_TOKEN_WORDS.has(symbol)
    ? symbol
    : '';
};

const inferPromptSymbol = (prompt: string) =>
  toTokenSymbol(
    DESTINATION_AFTER_CONNECTOR.exec(prompt)?.[1] ??
      SYMBOL_AFTER_ACTION.exec(prompt)?.[1],
  );

const inferFiatAmount = (prompt: string) =>
  /\$\s*(\d+(?:\.\d+)?)/.exec(prompt)?.[1] ?? '';

const inferNetwork = (prompt: string) => {
  const networkPhrase =
    /\b(?:on|over|via|network(?:\s+is)?|switch(?:\s+it)?\s+to)\s+(.+)$/i.exec(
      prompt,
    )?.[1] ?? '';

  return (
    NETWORK_ALIASES.find(([pattern]) => pattern.test(networkPhrase))?.[1] ?? ''
  );
};

const inferPercentAmount = (prompt: string) => {
  const percentage = PERCENT_AMOUNT.exec(prompt)?.[1];
  if (percentage) return percentage;
  if (/\bhalf\b/i.test(prompt)) return '50';
  if (/\ball\b/i.test(prompt)) return '100';
  return '';
};

const getTradeSymbols = (prompt: string) => {
  const action = TRADE_ACTION.exec(prompt)?.[1]?.toLowerCase();

  if (action === 'buy' || action === 'purchase') {
    return {
      sourceSymbol: toTokenSymbol(BUY_SOURCE.exec(prompt)?.[2]),
      destinationSymbol: toTokenSymbol(BUY_DESTINATION.exec(prompt)?.[1]),
    };
  }

  return {
    sourceSymbol: toTokenSymbol(SOURCE_AFTER_ACTION.exec(prompt)?.[1]),
    destinationSymbol: toTokenSymbol(
      DESTINATION_AFTER_CONNECTOR.exec(prompt)?.[1],
    ),
  };
};

const getTradeAmount = (
  prompt: string,
  sourceSymbol: string,
): Pick<
  WalletAssistantSwapIntent,
  'amountType' | 'amountValue' | 'sourceAmount'
> => {
  const fiatAmount = inferFiatAmount(prompt);
  if (fiatAmount) {
    return {
      amountType: 'fiat',
      amountValue: fiatAmount,
      sourceAmount: '',
    };
  }

  const percentAmount = inferPercentAmount(prompt);
  if (percentAmount) {
    return {
      amountType: 'percent',
      amountValue: percentAmount,
      sourceAmount: '',
    };
  }

  const exactMatch = EXACT_SOURCE_AMOUNT.exec(prompt);
  if (exactMatch && toTokenSymbol(exactMatch[2]) === sourceSymbol) {
    return {
      amountType: 'exact',
      amountValue: exactMatch[1],
      sourceAmount: exactMatch[1],
    };
  }

  const buySourceMatch = BUY_SOURCE.exec(prompt);
  if (
    buySourceMatch?.[1] &&
    toTokenSymbol(buySourceMatch[2]) === sourceSymbol
  ) {
    return {
      amountType: 'exact',
      amountValue: buySourceMatch[1],
      sourceAmount: buySourceMatch[1],
    };
  }

  return {
    amountType: 'unspecified',
    amountValue: '',
    sourceAmount: '',
  };
};

const buildTradeResearchResponse = (
  intent: WalletAssistantSwapIntent,
): WalletAssistantResearchResponse => {
  const pair = [intent.sourceSymbol, intent.destinationSymbol].filter(Boolean);
  const destinationArticle = /^[AEIOU]/i.test(intent.destinationSymbol)
    ? 'an'
    : 'a';
  const title =
    pair.length === 2
      ? `Prepare ${pair[0]} → ${pair[1]} swap`
      : intent.destinationSymbol
        ? `Prepare ${destinationArticle} ${intent.destinationSymbol} purchase`
        : `Prepare a ${intent.sourceSymbol || 'token'} sale`;
  const missingSelection = !intent.sourceSymbol
    ? 'payment token'
    : !intent.destinationSymbol
      ? 'token to receive'
      : '';

  return {
    asOf: '',
    assets: [],
    chart: { labels: [], sourceIds: [], title: '', unit: '', values: [] },
    sections: [],
    sources: [],
    summary: missingSelection
      ? `Choose the ${missingSelection}, then review the live MetaMask quote.`
      : 'Review the assets and amount, then open the live MetaMask quote before confirming.',
    swapIntent: intent,
    title,
    tokens: pair,
  };
};

/**
 * Builds a fast, deterministic trade response for commands that do not need
 * model reasoning or web research. Follow-up edits are limited to explicit,
 * unambiguous fields and never confirm or submit a transaction.
 */
export const buildImmediateTradeResponse = (
  prompt: string,
  previousIntent?: WalletAssistantSwapIntent,
): WalletAssistantResearchResponse | undefined => {
  if (isDirectTradeRequest(prompt)) {
    const symbols = getTradeSymbols(prompt);
    const amount = getTradeAmount(prompt, symbols.sourceSymbol);
    const intent: WalletAssistantSwapIntent = {
      ...amount,
      enabled: true,
      mode: 'real',
      network: inferNetwork(prompt),
      ...symbols,
    };

    return intent.sourceSymbol || intent.destinationSymbol
      ? buildTradeResearchResponse(intent)
      : undefined;
  }

  if (!previousIntent?.enabled || PAPER_TRADE_REQUEST.test(prompt)) {
    return undefined;
  }

  const fiatAmount = MAKE_IT_FIAT.exec(prompt)?.[1];
  const paymentSymbol = toTokenSymbol(PAY_WITH_SYMBOL.exec(prompt)?.[1]);
  const network = EXPLICIT_NETWORK_FOLLOW_UP.test(prompt)
    ? inferNetwork(prompt)
    : '';
  if (!fiatAmount && !paymentSymbol && !network) {
    return undefined;
  }

  return buildTradeResearchResponse({
    ...previousIntent,
    ...(fiatAmount
      ? {
          amountType: 'fiat' as const,
          amountValue: fiatAmount,
          sourceAmount: '',
        }
      : {}),
    ...(paymentSymbol ? { sourceSymbol: paymentSymbol } : {}),
    ...(network ? { network } : {}),
  });
};

const buildFallbackSwapIntent = (
  prompt: string,
  research: WalletAssistantResearchResponse,
): WalletAssistantSwapIntent => {
  const action = TRADE_ACTION.exec(prompt)?.[1]?.toLowerCase();
  const parsedSymbols = getTradeSymbols(prompt);
  const inferredSymbol =
    (action === 'sell'
      ? parsedSymbols.sourceSymbol
      : parsedSymbols.destinationSymbol) ||
    research.tokens.map(toTokenSymbol).find(Boolean) ||
    inferPromptSymbol(prompt);
  const fiatAmount = inferFiatAmount(prompt);
  const isSell = action === 'sell';

  return {
    amountType: fiatAmount ? 'fiat' : 'unspecified',
    amountValue: fiatAmount,
    enabled: true,
    mode: 'real',
    network: '',
    sourceAmount: '',
    sourceSymbol: isSell ? inferredSymbol : '',
    destinationSymbol: isSell ? '' : inferredSymbol,
  };
};

/**
 * Direct trading language takes precedence over an information-only model
 * response. The assistant still only prepares a MetaMask Swap; review and
 * confirmation remain in MetaMask's trusted transaction flow.
 */
export const prioritizeDirectTradeRequest = (
  prompt: string,
  research: WalletAssistantResearchResponse,
): WalletAssistantResearchResponse => {
  if (!isDirectTradeRequest(prompt) || research.swapIntent.enabled) {
    return research;
  }

  const swapIntent = buildFallbackSwapIntent(prompt, research);
  const symbol =
    swapIntent.destinationSymbol || swapIntent.sourceSymbol || 'token';
  const article = /^[AEIOU]/i.test(symbol) ? 'an' : 'a';

  return {
    ...research,
    chart: { labels: [], sourceIds: [], title: '', unit: '', values: [] },
    sections: [],
    sources: [],
    summary:
      'Choose your funding token and amount, then review a live MetaMask quote before confirming.',
    swapIntent,
    title: `Prepare ${article} ${symbol} trade`,
  };
};
