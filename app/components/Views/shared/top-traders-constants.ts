// Chains surfaced in the social leaderboard.
//
// SPOT_CHAINS: token-only rankings (TopTradersView "Tokens" tab and the
// homepage carousel).
// ALL_CHAINS: combined spot + perps rankings (TopTradersView "All" tab).
// PERP_CHAINS: perps-only rankings (TopTradersView "Perps" tab).
export const SPOT_CHAINS: string[] = ['base', 'solana', 'ethereum'];

export const ALL_CHAINS: string[] = [...SPOT_CHAINS, 'hyperliquid'];

export const PERP_CHAINS: string[] = ['hyperliquid'];
