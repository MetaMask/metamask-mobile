import { createPack } from '../../views/testUtils';
import { resolveDiscoveryPack } from './discoveryPack';

const core = createPack({ code: 'pokemon_25', price: 25, category: 'Pokemon' });
const charged = createPack({
  code: 'pokemon_50',
  price: 50,
  category: 'Pokemon',
});
const card = { mint: 'MintA', name: 'Card', category: 'Pokemon' };

describe('resolveDiscoveryPack', () => {
  it('uses the exact source instead of a cheaper category recommendation', () => {
    expect(
      resolveDiscoveryPack(card, [core, charged], 'pack_partner:pokemon_50'),
    ).toEqual({ source: charged, buyPack: charged });
  });

  it('keeps a provider pool source when no indexed origin was supplied', () => {
    expect(
      resolveDiscoveryPack({ ...card, sourcePackCode: charged.code }, [
        core,
        charged,
      ]),
    ).toEqual({ source: charged, buyPack: charged });
  });

  it('offers the least expensive matching category without inventing provenance', () => {
    const packs = [charged, core];
    expect(resolveDiscoveryPack(card, packs)).toEqual({
      source: undefined,
      buyPack: core,
    });
    expect(packs).toEqual([charged, core]);
  });

  it('does not parse an opaque pack type or select an unrelated category', () => {
    expect(
      resolveDiscoveryPack(
        { ...card, category: 'Unknown' },
        [core],
        'another:pack_partner:pokemon_25',
      ),
    ).toEqual({ source: undefined, buyPack: undefined });
  });
});
