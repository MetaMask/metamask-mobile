import { TrxScope } from '@metamask/keyring-api';
import { KnownCaip19Id } from './constants';
import {
  getTronSpecialAssetMapKey,
  getTronSpecialAssetUnit,
  isTronSpecialAssetId,
  toDecimalTronCaipChainId,
} from './tronSpecialAssets';

describe('tronSpecialAssets', () => {
  it('maps every KnownCaip19Id to a special-asset key', () => {
    for (const assetId of Object.values(KnownCaip19Id)) {
      expect(getTronSpecialAssetMapKey(assetId)).toBeDefined();
    }
  });

  it('matches hex and decimal Tron chain references for staking CAIP-19s', () => {
    expect(
      getTronSpecialAssetMapKey('tron:728126428/slip44:195-staked-for-energy'),
    ).toBe('stakedTrxForEnergy');
    expect(
      getTronSpecialAssetMapKey('tron:0x2b6653dc/slip44:195-staked-for-energy'),
    ).toBe('stakedTrxForEnergy');
    expect(
      getTronSpecialAssetMapKey(
        'tron:0x2b6653dc/slip44:195-staked-for-bandwidth',
      ),
    ).toBe('stakedTrxForBandwidth');
    expect(
      getTronSpecialAssetMapKey('tron:728126428/slip44:195-staking-rewards'),
    ).toBe('trxStakingRewards');
    expect(getTronSpecialAssetMapKey('tron:728126428/slip44:energy')).toBe(
      'energy',
    );
  });

  it('does not treat native TRX or TRC-20 as special assets', () => {
    expect(isTronSpecialAssetId('tron:728126428/slip44:195')).toBe(false);
    expect(isTronSpecialAssetId('tron:0x2b6653dc/slip44:195')).toBe(false);
    expect(
      isTronSpecialAssetId(
        'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      ),
    ).toBe(false);
    expect(isTronSpecialAssetId('tron:728126428/slip44:strx-energy')).toBe(
      false,
    );
    expect(isTronSpecialAssetId(undefined)).toBe(false);
    expect(isTronSpecialAssetId('not-caip')).toBe(false);
  });

  it('returns the display unit for special assets', () => {
    expect(
      getTronSpecialAssetUnit('tron:728126428/slip44:195-staked-for-energy'),
    ).toBe('TRX');
    expect(getTronSpecialAssetUnit('tron:728126428/slip44:energy')).toBe(
      'ENERGY',
    );
    expect(
      getTronSpecialAssetUnit('tron:728126428/slip44:195'),
    ).toBeUndefined();
  });

  it('normalizes hex Tron CAIP-2 chain ids to decimal TrxScope form', () => {
    expect(toDecimalTronCaipChainId('tron:0x2b6653dc')).toBe(TrxScope.Mainnet);
    expect(toDecimalTronCaipChainId(TrxScope.Mainnet)).toBe(TrxScope.Mainnet);
    expect(toDecimalTronCaipChainId('eip155:1')).toBeUndefined();
    expect(toDecimalTronCaipChainId('not-a-caip')).toBeUndefined();
    expect(toDecimalTronCaipChainId(undefined)).toBeUndefined();
  });
});
