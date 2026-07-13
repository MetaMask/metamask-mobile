import type { PredictPosition } from '../../../UI/Predict/types';

/** Coarse Predict groupings for balance breakdown (matches design: Sports / Politics / Crypto). */
export type PredictBreakdownCategory = 'sports' | 'politics' | 'crypto' | 'other';

const SPORTS_HINTS =
  /\b(nfl|nba|mlb|nhl|mls|ufc|f1|pga|atp|wta|epl|ucl|uefa|ligue\s*1|serie\s*a|bundesliga|premier\s*league|champions\s*league|super\s*bowl|world\s*cup|olympics|eredivisie|lig\s*mx|formula\s*1|tennis|golf|ncaa|wnba|soccer|football|basketball|baseball|hockey)\b/i;

const POLITICS_HINTS =
  /\b(election|president|senate|congress|governor|politic|parliament|referendum|democrat|republican|cabinet|impeach|vote\s*202)\b/i;

const CRYPTO_HINTS =
  /\b(bitcoin|btc|ethereum|eth|crypto|solana|sol|token|defi|nft|blockchain|meme\s*coin|memecoin|layer\s*2|\bl2\b)\b/i;

/**
 * Best-effort category from title/slug. API positions do not include a stable category field;
 * this mirrors how users browse Predict (sports / politics / crypto).
 */
export function inferPredictBreakdownCategory(
  position: Pick<PredictPosition, 'title'> & { slug?: string },
): PredictBreakdownCategory {
  const blob = `${position.title}\n${position.slug ?? ''}`.toLowerCase();
  if (SPORTS_HINTS.test(blob)) {
    return 'sports';
  }
  if (POLITICS_HINTS.test(blob)) {
    return 'politics';
  }
  if (CRYPTO_HINTS.test(blob)) {
    return 'crypto';
  }
  return 'other';
}
