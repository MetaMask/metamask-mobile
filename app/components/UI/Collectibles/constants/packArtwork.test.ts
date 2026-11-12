import { getCollectiblesPackArtwork } from './packArtwork';
import pokemonCore from '../assets/named-packs/pokemon-core.webp';
import pokemonCharged from '../assets/named-packs/pokemon-charged.webp';
import pokemonParagon from '../assets/named-packs/pokemon-paragon.webp';
import onePieceCharged from '../assets/named-packs/one-piece-charged.webp';

jest.mock('../assets/named-packs/pokemon-core.webp', () => 31);
jest.mock('../assets/named-packs/pokemon-charged.webp', () => 32);
jest.mock('../assets/named-packs/pokemon-paragon.webp', () => 33);
jest.mock('../assets/named-packs/one-piece-charged.webp', () => 34);

describe('Collectibles pack artwork', () => {
  it.each([
    ['pokemon_25', 'Pokémon Core Pack', pokemonCore],
    ['pokemon_50', 'Pokémon Charged Pack', pokemonCharged],
    ['pokemon_2500', 'Pokémon Paragon Pack', pokemonParagon],
    ['onepiece_50', 'One Piece Charged Pack', onePieceCharged],
  ])('resolves %s by its explicit provider identity', (code, name, image) => {
    const packType = `pack_partner:${code}`;

    const artwork = getCollectiblesPackArtwork(packType);

    expect(artwork).toEqual({ name, image, glowColor: expect.any(String) });
  });

  it.each([
    'pack_partner:future_pack_75',
    'pack_partner:sealed_80',
    'another_provider:pokemon_50',
    '',
    '__proto__',
    'constructor',
  ])('leaves the API title unchanged for unmapped identity %s', (packType) => {
    const artwork = getCollectiblesPackArtwork(packType);

    expect(artwork).toEqual({ image: pokemonCore });
  });
});
