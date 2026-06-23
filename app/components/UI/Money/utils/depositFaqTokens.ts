import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NETWORK_TO_NAME_MAP } from '../../../../core/Engine/constants';
import { WildcardTokenList } from '../../Earn/utils/wildcardTokenList';

const NETWORK_NAMES = NETWORK_TO_NAME_MAP as Record<string, string>;

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
