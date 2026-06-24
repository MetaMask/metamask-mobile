import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NETWORK_TO_NAME_MAP } from '../../../../core/Engine/constants';
import { WildcardTokenList } from '../../Earn/utils/wildcardTokenList';

const NETWORK_NAMES = NETWORK_TO_NAME_MAP as Record<string, string>;

/**
 * Symbols excluded from the inline faq_a1 sentence only. That sentence describes
 * depositing a stablecoin that "converts to mUSD", so listing mUSD itself reads
 * as circular. mUSD is still shown in the per-chain deposit list (faq_a7) since
 * it is a valid no-fee deposit.
 */
const INLINE_EXCLUDED_SYMBOLS = new Set(['MUSD']);

const isInlineExcludedSymbol = (symbol: string): boolean =>
  INLINE_EXCLUDED_SYMBOLS.has(symbol.toUpperCase());

export const MONEY_NO_FEE_TOKENS_FALLBACK: WildcardTokenList = {
  [CHAIN_IDS.MAINNET]: [
    'USDC',
    'aUSDC',
    'USDT',
    'aUSDT',
    'DAI',
    'aDAI',
    'MUSD',
  ],
  [CHAIN_IDS.LINEA_MAINNET]: ['MUSD'],
  [CHAIN_IDS.ARBITRUM]: ['USDC', 'aUSDCN'],
  [CHAIN_IDS.BASE]: ['USDC', 'aUSDC'],
  [CHAIN_IDS.BSC]: ['USDC', 'aUSDC', 'aUSDT', 'USDT'],
  [CHAIN_IDS.MONAD]: ['USDC'],
};

/**
 * Formats the per-chain no-fee token list as bullet lines, e.g.
 * "• Ethereum: USDC, USDT, DAI". Chains without a known network name are
 * omitted so the user-facing FAQ never shows a raw chain id.
 */
export const formatNoFeeTokenBullets = (list: WildcardTokenList): string =>
  Object.entries(list)
    .map(([chainId, symbols]) => {
      const name = NETWORK_NAMES[chainId];
      return name ? `• ${name}: ${symbols.join(', ')}` : null;
    })
    .filter((line): line is string => line !== null)
    .join('\n');

/**
 * Returns the unique base stablecoin symbols (excluding aave-wrapped aTokens)
 * across all chains, formatted as an "or" list, e.g. "USDC, USDT, or DAI".
 */
export const formatBaseStablecoins = (list: WildcardTokenList): string => {
  const seen = new Set<string>();
  const stablecoins: string[] = [];
  for (const symbols of Object.values(list)) {
    for (const symbol of symbols) {
      // aTokens (aUSDC, aUSDT, aDAI) are wrapped variants; the inline FAQ
      // sentence lists only the base stablecoins, and excludes mUSD.
      if (
        /^a[A-Z]/.test(symbol) ||
        isInlineExcludedSymbol(symbol) ||
        seen.has(symbol)
      ) {
        continue;
      }
      seen.add(symbol);
      stablecoins.push(symbol);
    }
  }

  if (stablecoins.length <= 1) {
    return stablecoins.join('');
  }
  if (stablecoins.length === 2) {
    return `${stablecoins[0]} or ${stablecoins[1]}`;
  }
  const last = stablecoins[stablecoins.length - 1];
  return `${stablecoins.slice(0, -1).join(', ')}, or ${last}`;
};
