import animeAmpedArtwork from '../assets/named-packs/anime-amped.webp';
import baseballOverdriveArtwork from '../assets/named-packs/baseball-overdrive.webp';
import baseballSupremeArtwork from '../assets/named-packs/baseball-supreme.webp';
import basketballOverdriveArtwork from '../assets/named-packs/basketball-overdrive.webp';
import basketballSupremeArtwork from '../assets/named-packs/basketball-supreme.webp';
import disneyLorcanaChargedArtwork from '../assets/named-packs/disney-lorcana-charged.webp';
import disneyLorcanaOverdriveArtwork from '../assets/named-packs/disney-lorcana-overdrive.webp';
import dragonBallZChargedArtwork from '../assets/named-packs/dragon-ball-z-charged.webp';
import dragonBallZOverdriveArtwork from '../assets/named-packs/dragon-ball-z-overdrive.webp';
import dragonBallZSupremeArtwork from '../assets/named-packs/dragon-ball-z-supreme.webp';
import footballOverdriveArtwork from '../assets/named-packs/football-overdrive.webp';
import footballSupremeArtwork from '../assets/named-packs/football-supreme.webp';
import onePieceChargedArtwork from '../assets/named-packs/one-piece-charged.webp';
import onePieceExaltedArtwork from '../assets/named-packs/one-piece-exalted.webp';
import onePieceSupremeArtwork from '../assets/named-packs/one-piece-supreme.webp';
import pokemonChargedArtwork from '../assets/named-packs/pokemon-charged.webp';
import pokemonCoreArtwork from '../assets/named-packs/pokemon-core.webp';
import pokemonExaltedArtwork from '../assets/named-packs/pokemon-exalted.webp';
import pokemonGengarArtwork from '../assets/named-packs/pokemon-gengar.webp';
import pokemonGhostsArtwork from '../assets/named-packs/pokemon-ghosts.webp';
import pokemonIconicArtwork from '../assets/named-packs/pokemon-iconic.webp';
import pokemonOverdriveArtwork from '../assets/named-packs/pokemon-overdrive.webp';
import pokemonParagonArtwork from '../assets/named-packs/pokemon-paragon.webp';
import pokemonPinnacleArtwork from '../assets/named-packs/pokemon-pinnacle.webp';
import pokemonPsa10OnlyArtwork from '../assets/named-packs/pokemon-psa10-only.webp';
import pokemonSpookyArtwork from '../assets/named-packs/pokemon-spooky.webp';
import pokemonSupremeArtwork from '../assets/named-packs/pokemon-supreme.webp';
import riftboundChargedArtwork from '../assets/named-packs/riftbound-charged.webp';
import riftboundOverdriveArtwork from '../assets/named-packs/riftbound-overdrive.webp';
import riftboundSupremeArtwork from '../assets/named-packs/riftbound-supreme.webp';
import soccerChargedArtwork from '../assets/named-packs/soccer-charged.webp';
import soccerOverdriveArtwork from '../assets/named-packs/soccer-overdrive.webp';
import soccerSupremeArtwork from '../assets/named-packs/soccer-supreme.webp';
import sportsChargedArtwork from '../assets/named-packs/sports-charged.webp';
import sportsCoreArtwork from '../assets/named-packs/sports-core.webp';
import sportsExaltedArtwork from '../assets/named-packs/sports-exalted.webp';
import sportsIconicArtwork from '../assets/named-packs/sports-iconic.webp';
import sportsOverdriveArtwork from '../assets/named-packs/sports-overdrive.webp';
import sportsParagonArtwork from '../assets/named-packs/sports-paragon.webp';
import sportsPinnacleArtwork from '../assets/named-packs/sports-pinnacle.webp';
import sportsSupremeArtwork from '../assets/named-packs/sports-supreme.webp';
import watchesIconicArtwork from '../assets/named-packs/watches-iconic.webp';
import watchesSupremeArtwork from '../assets/named-packs/watches-supreme.webp';

/** Display-only assets; provider prices, odds and transaction data stay authoritative. */
export interface PackArtwork {
  readonly name?: string;
  readonly image: number;
  /** Dominant artwork hue using Replit's 48px palette sampling; decoration only. */
  readonly glowColor?: string;
}

/** Explicit provider:pack-code identities. Add an entry when designers supply new artwork. */
export const PACK_ARTWORK: Readonly<
  Record<string, PackArtwork & { name: string }>
> = {
  'pack_partner:anime_75': {
    name: 'Anime Amped Pack',
    image: animeAmpedArtwork,
    glowColor: 'hsl(337, 92%, 55%)',
  },
  'pack_partner:baseball_100': {
    name: 'Baseball Overdrive Pack',
    image: baseballOverdriveArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:baseball_250': {
    name: 'Baseball Supreme Pack',
    image: baseballSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:basketball_100': {
    name: 'Basketball Overdrive Pack',
    image: basketballOverdriveArtwork,
    glowColor: 'hsl(22, 92%, 55%)',
  },
  'pack_partner:basketball_250': {
    name: 'Basketball Supreme Pack',
    image: basketballSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:lorcana_50': {
    name: 'Disney Lorcana Charged Pack',
    image: disneyLorcanaChargedArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:lorcana_100': {
    name: 'Disney Lorcana Overdrive Pack',
    image: disneyLorcanaOverdriveArtwork,
    glowColor: 'hsl(217, 92%, 55%)',
  },
  'pack_partner:dragonball_50': {
    name: 'Dragon Ball Z Charged Pack',
    image: dragonBallZChargedArtwork,
    glowColor: 'hsl(22, 92%, 55%)',
  },
  'pack_partner:dragonball_100': {
    name: 'Dragon Ball Z Overdrive Pack',
    image: dragonBallZOverdriveArtwork,
    glowColor: 'hsl(22, 92%, 55%)',
  },
  'pack_partner:dragonball_250': {
    name: 'Dragon Ball Z Supreme Pack',
    image: dragonBallZSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:football_100': {
    name: 'Football Overdrive Pack',
    image: footballOverdriveArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:football_250': {
    name: 'Football Supreme Pack',
    image: footballSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:onepiece_50': {
    name: 'One Piece Charged Pack',
    image: onePieceChargedArtwork,
    glowColor: 'hsl(187, 92%, 55%)',
  },
  'pack_partner:onepiece_1000': {
    name: 'One Piece Exalted Pack',
    image: onePieceExaltedArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:onepiece_250': {
    name: 'One Piece Supreme Pack',
    image: onePieceSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:pokemon_50': {
    name: 'Pokémon Charged Pack',
    image: pokemonChargedArtwork,
    glowColor: 'hsl(67, 92%, 55%)',
  },
  'pack_partner:pokemon_25': {
    name: 'Pokémon Core Pack',
    image: pokemonCoreArtwork,
    glowColor: 'hsl(217, 92%, 55%)',
  },
  'pack_partner:pokemon_1000': {
    name: 'Pokémon Exalted Pack',
    image: pokemonExaltedArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:egengar_100': {
    name: 'Pokémon Gengar Pack',
    image: pokemonGengarArtwork,
    glowColor: 'hsl(277, 92%, 55%)',
  },
  'pack_partner:ghost_50': {
    name: 'Pokémon Ghosts Pack',
    image: pokemonGhostsArtwork,
    glowColor: 'hsl(262, 92%, 55%)',
  },
  'pack_partner:pokemon_500': {
    name: 'Pokémon Iconic Pack',
    image: pokemonIconicArtwork,
    glowColor: 'hsl(202, 92%, 55%)',
  },
  'pack_partner:pokemon_100': {
    name: 'Pokémon Overdrive Pack',
    image: pokemonOverdriveArtwork,
    glowColor: 'hsl(22, 92%, 55%)',
  },
  'pack_partner:pokemon_2500': {
    name: 'Pokémon Paragon Pack',
    image: pokemonParagonArtwork,
    glowColor: 'hsl(262, 92%, 55%)',
  },
  'pack_partner:pokemon_5000': {
    name: 'Pokémon Pinnacle Pack',
    image: pokemonPinnacleArtwork,
    glowColor: 'hsl(202, 92%, 55%)',
  },
  'pack_partner:e10_10': {
    name: 'Pokémon PSA 10 Only Pack',
    image: pokemonPsa10OnlyArtwork,
    glowColor: 'hsl(352, 92%, 55%)',
  },
  'pack_partner:ghost_500': {
    name: 'Pokémon Spooky Pack',
    image: pokemonSpookyArtwork,
    glowColor: 'hsl(22, 92%, 55%)',
  },
  'pack_partner:pokemon_250': {
    name: 'Pokémon Supreme Pack',
    image: pokemonSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:riftbound_50': {
    name: 'Riftbound Charged Pack',
    image: riftboundChargedArtwork,
    glowColor: 'hsl(202, 92%, 55%)',
  },
  'pack_partner:riftbound_100': {
    name: 'Riftbound Overdrive Pack',
    image: riftboundOverdriveArtwork,
    glowColor: 'hsl(217, 92%, 55%)',
  },
  'pack_partner:riftbound_250': {
    name: 'Riftbound Supreme Pack',
    image: riftboundSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:soccer_50': {
    name: 'Soccer Charged Pack',
    image: soccerChargedArtwork,
    glowColor: 'hsl(97, 92%, 55%)',
  },
  'pack_partner:soccer_100': {
    name: 'Soccer Overdrive Pack',
    image: soccerOverdriveArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:soccer_250': {
    name: 'Soccer Supreme Pack',
    image: soccerSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_50': {
    name: 'Sports Charged Pack',
    image: sportsChargedArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_25': {
    name: 'Sports Core Pack',
    image: sportsCoreArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_1000': {
    name: 'Sports Exalted Pack',
    image: sportsExaltedArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_500': {
    name: 'Sports Iconic Pack',
    image: sportsIconicArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_100': {
    name: 'Sports Overdrive Pack',
    image: sportsOverdriveArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_2500': {
    name: 'Sports Paragon Pack',
    image: sportsParagonArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_5000': {
    name: 'Sports Pinnacle Pack',
    image: sportsPinnacleArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:sports_250': {
    name: 'Sports Supreme Pack',
    image: sportsSupremeArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:ewatch_500': {
    name: 'Watches Iconic Pack',
    image: watchesIconicArtwork,
    glowColor: 'hsl(37, 92%, 55%)',
  },
  'pack_partner:ewatch_250': {
    name: 'Watches Supreme Pack',
    image: watchesSupremeArtwork,
    glowColor: 'hsl(217, 92%, 55%)',
  },
};

/** Unknown packs retain their API name and use the current Core illustration as a fallback. */
export function getCollectiblesPackArtwork(packType: string): PackArtwork {
  return Object.hasOwn(PACK_ARTWORK, packType)
    ? PACK_ARTWORK[packType]
    : { image: pokemonCoreArtwork };
}
