// Chains surfaced in the spot leaderboard ("All" tab + per-chain tabs).
//
// Hyperliquid is intentionally excluded: omitting `chains` from the leaderboard
// request causes Clicker to combine PnL across all four chains, where perps
// activity dwarfs spot PnL and dominates the rankings (top global traders are
// almost entirely hyperliquid). The perps surface is planned as its own tab in
// a future ticket.
//
// Shared between TopTradersView (the "All" tab), TopTradersSection (homepage
// carousel).
export const SPOT_CHAINS: string[] = ['base', 'solana', 'ethereum'];
