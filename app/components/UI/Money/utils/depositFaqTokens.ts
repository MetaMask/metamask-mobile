import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NETWORK_TO_NAME_MAP } from '../../../../core/Engine/constants';
import { WildcardTokenList } from '../../Earn/utils/wildcardTokenList';
import { MUSD_TOKEN } from '../../Earn/constants/musd';

const NETWORK_NAMES = NETWORK_TO_NAME_MAP as Record<string, string>;

/** Display symbol for mUSD in the FAQ no-fee list. */
const MUSD_SYMBOL = MUSD_TOKEN.symbol;

/**
 * Monad mUSD -> Monad mUSD needs no swap or bridge, so the relay fixed-spread
 * flag omits it from its routes; depositing Monad mUSD still incurs no fee, so
 * the FAQ lists it explicitly, first, ahead of the route-derived tokens.
 * Mirrors the `isMonadMusd` no-fee edge case in useMoneyDepositTokens.
 *
 * Returns a new list and never mutates the input (the input may be the shared
 * MONEY_NO_FEE_TOKENS_FALLBACK constant).
 */
export const ensureMonadMusdListed = (
  list: WildcardTokenList,
): WildcardTokenList => {
  const monadTokens = list[CHAIN_IDS.MONAD] ?? [];
  if (monadTokens[0] === MUSD_SYMBOL) {
    return list;
  }
  return {
    ...list,
    [CHAIN_IDS.MONAD]: [
      MUSD_SYMBOL,
      ...monadTokens.filter((symbol) => symbol !== MUSD_SYMBOL),
    ],
  };
};

export const MONEY_NO_FEE_TOKENS_FALLBACK: WildcardTokenList = {
  [CHAIN_IDS.MAINNET]: [
    'USDC',
    'aUSDC',
    'USDT',
    'aUSDT',
    'DAI',
    'aDAI',
    'mUSD',
  ],
  [CHAIN_IDS.LINEA_MAINNET]: ['mUSD'],
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
