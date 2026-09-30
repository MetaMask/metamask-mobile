import { create, is } from '@metamask/superstruct';

import {
  buybackCheck,
  machinePokemon50,
  nftWon,
  openPackAwarded,
  openPackPending,
  packStatus,
  packStatusUnknown,
  status,
  walletCards,
} from '../services/api.fixtures';
import {
  CcAttributeStruct,
  CcBuybackAvailableStruct,
  CcBuybackCheckStruct,
  CcMachineStruct,
  CcNftWonStruct,
  CcOpenPackAwardedStruct,
  CcOpenPackPendingStruct,
  CcOpenPackResponseStruct,
  CcPackStatusStruct,
  CcStatusStruct,
  CcWalletCardStruct,
} from '.';

describe('CollectorCrypt schemas', () => {
  it.each([
    ['a machine', CcMachineStruct, machinePokemon50],
    ['the gacha status', CcStatusStruct, status],
    ['an awarded NFT', CcNftWonStruct, nftWon],
    ['a pack status', CcPackStatusStruct, packStatus],
    ['an unknown pack status', CcPackStatusStruct, packStatusUnknown],
    ['a buyback check', CcBuybackCheckStruct, buybackCheck],
    ['a wallet card', CcWalletCardStruct, walletCards.filterNFtCard[0]],
  ] as const)('accepts %s captured live', (_label, struct, value) => {
    expect(struct.is(value)).toBe(true);
  });

  it('tolerates unknown fields and null optional fields', () => {
    const machine = {
      ...machinePokemon50,
      menuCategory: null,
      menuOrder: null,
      stock: null,
      somethingNew: { nested: true },
    };

    expect(is(machine, CcMachineStruct)).toBe(true);
  });

  it('rejects a machine without a price', () => {
    const { price: _price, ...machine } = machinePokemon50;

    expect(is(machine, CcMachineStruct)).toBe(false);
  });

  it('coerces numeric and boolean attribute values to strings', () => {
    expect(
      create({ trait_type: 'Year', value: 2024 }, CcAttributeStruct),
    ).toStrictEqual({ trait_type: 'Year', value: '2024' });
    expect(
      create({ trait_type: 'Autographed', value: false }, CcAttributeStruct),
    ).toStrictEqual({ trait_type: 'Autographed', value: 'false' });
  });

  it('tells a pending openPack response from an awarded one', () => {
    expect(is(openPackPending, CcOpenPackPendingStruct)).toBe(true);
    expect(is(openPackAwarded, CcOpenPackPendingStruct)).toBe(false);
    expect(is(openPackAwarded, CcOpenPackAwardedStruct)).toBe(true);
    expect(is(openPackAwarded, CcOpenPackResponseStruct)).toBe(true);
    expect(is(openPackPending, CcOpenPackResponseStruct)).toBe(true);
  });

  it('rejects an openPack response that is neither awarded nor pending', () => {
    expect(
      is({ success: true, code: 'SOMETHING_ELSE' }, CcOpenPackResponseStruct),
    ).toBe(false);
  });

  it('accepts buyback amounts as numbers or strings', () => {
    expect(
      is({ available: true, amount: 42500000 }, CcBuybackAvailableStruct),
    ).toBe(true);
    expect(
      is({ available: true, amount: '42500000' }, CcBuybackAvailableStruct),
    ).toBe(true);
    expect(is({ available: false }, CcBuybackAvailableStruct)).toBe(true);
  });
});
