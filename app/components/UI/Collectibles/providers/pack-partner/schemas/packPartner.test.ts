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
  PpAttributeStruct,
  PpBuybackAvailableStruct,
  PpBuybackCheckStruct,
  PpMachineStruct,
  PpNftWonStruct,
  PpOpenPackAwardedStruct,
  PpOpenPackPendingStruct,
  PpOpenPackResponseStruct,
  PpPackStatusStruct,
  PpStatusStruct,
  PpWalletCardStruct,
} from './packPartner';

describe('PackPartner schemas', () => {
  it.each([
    ['a machine', PpMachineStruct, machinePokemon50],
    ['the collectibles status', PpStatusStruct, status],
    ['an awarded NFT', PpNftWonStruct, nftWon],
    ['a pack status', PpPackStatusStruct, packStatus],
    ['an unknown pack status', PpPackStatusStruct, packStatusUnknown],
    ['a buyback check', PpBuybackCheckStruct, buybackCheck],
    ['a wallet card', PpWalletCardStruct, walletCards.filterNFtCard[0]],
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

    expect(is(machine, PpMachineStruct)).toBe(true);
  });

  it('rejects a machine without a price', () => {
    const { price: _price, ...machine } = machinePokemon50;

    expect(is(machine, PpMachineStruct)).toBe(false);
  });

  it('coerces numeric and boolean attribute values to strings', () => {
    expect(
      create({ trait_type: 'Year', value: 2024 }, PpAttributeStruct),
    ).toStrictEqual({ trait_type: 'Year', value: '2024' });
    expect(
      create({ trait_type: 'Autographed', value: false }, PpAttributeStruct),
    ).toStrictEqual({ trait_type: 'Autographed', value: 'false' });
  });

  it('tells a pending openPack response from an awarded one', () => {
    expect(is(openPackPending, PpOpenPackPendingStruct)).toBe(true);
    expect(is(openPackAwarded, PpOpenPackPendingStruct)).toBe(false);
    expect(is(openPackAwarded, PpOpenPackAwardedStruct)).toBe(true);
    expect(is(openPackAwarded, PpOpenPackResponseStruct)).toBe(true);
    expect(is(openPackPending, PpOpenPackResponseStruct)).toBe(true);
  });

  it('rejects an openPack response that is neither awarded nor pending', () => {
    expect(
      is({ success: true, code: 'SOMETHING_ELSE' }, PpOpenPackResponseStruct),
    ).toBe(false);
  });

  it('accepts buyback amounts as numbers or strings', () => {
    expect(
      is({ available: true, amount: 42500000 }, PpBuybackAvailableStruct),
    ).toBe(true);
    expect(
      is({ available: true, amount: '42500000' }, PpBuybackAvailableStruct),
    ).toBe(true);
    expect(is({ available: false }, PpBuybackAvailableStruct)).toBe(true);
  });
});
