import { strings } from '../../../../../locales/i18n';

// Category grouping and numbered price badges from Replit. Pack names/artwork are explicit constants.
// These prices classify the numbered tier badge only; they never select a name or image.
const PACK_TIER_PRICES: readonly number[] = [
  25, 50, 75, 100, 250, 500, 1000, 2500, 5000,
];

/** Numbered position in the approved price ladder; specialty prices stay untiered. */
export function packTierNumber(price: number): number | undefined {
  const index = PACK_TIER_PRICES.indexOf(price);
  return index < 0 ? undefined : index + 1;
}

export function canonicalPackCategory(
  code: string,
  category?: string,
  name = '',
): string | undefined {
  const identity = `${code} ${name}`.toLowerCase();
  if (/lorcana/.test(identity) || category === 'Disney Lorcana')
    return 'Disney Lorcana';
  if (/^(cc-)?(ghost|egengar)_/.test(code)) return 'Pokémon';
  // Specific identities take precedence over broad provider groups (e.g. Others)
  // and legacy IDs such as pokemon-watch-chrono.
  if (/watch/.test(identity) || /^(watch|watches)$/i.test(category ?? ''))
    return 'Watches';
  if (/dragon[\s-]*ball|dbz/.test(identity)) return 'Dragon Ball Z';
  if (/riftbound/.test(identity)) return 'Riftbound';
  if (/anime/.test(identity)) return 'Anime';
  if (/one[\s-]*piece/.test(identity)) return 'One Piece';
  for (const sport of ['Basketball', 'Baseball', 'Football', 'Soccer']) {
    if (
      identity.includes(sport.toLowerCase()) ||
      category?.toLowerCase() === sport.toLowerCase()
    )
      return sport;
  }
  if (/sports/.test(identity)) return 'Sports';
  if (/pok[eé]mon/.test(identity)) return 'Pokémon';
  const categories: Record<string, string> = {
    pokemon: 'Pokémon',
    pokémon: 'Pokémon',
    sports: 'Sports',
    'one piece': 'One Piece',
    'one-piece': 'One Piece',
    'dragon ball z': 'Dragon Ball Z',
    'dragon-ball-z': 'Dragon Ball Z',
    riftbound: 'Riftbound',
    anime: 'Anime',
  };
  return categories[category?.toLowerCase() ?? ''];
}

/** Replit hero labels omit the category already displayed immediately above.
 * Only curated artwork names are shortened; unknown API titles stay intact.
 */
export function packHeroTitle(
  artworkName: string | undefined,
  apiName: string,
  category?: string | null,
): string {
  if (!artworkName) return apiName;
  const tier = artworkName
    .replace(category ?? '', '')
    .replace(/\bpack\b/gi, '')
    .trim();
  return tier
    ? strings('collectibles_discovery.tier_pack', { tier })
    : artworkName;
}
