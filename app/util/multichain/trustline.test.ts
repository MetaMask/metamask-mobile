import { XlmScope } from '@metamask/keyring-api';
import { isAssetRequireActivate, isTrustlineAsset } from './trustline';

const STELLAR_USDC_ASSET_ID =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const STELLAR_NATIVE_ASSET_ID = `${XlmScope.Pubnet}/slip44:148`;

describe('isTrustlineAsset', () => {
  it('returns true for Stellar classic assets', () => {
    expect(isTrustlineAsset(STELLAR_USDC_ASSET_ID)).toBe(true);
  });

  it('returns false for native assets', () => {
    expect(isTrustlineAsset(STELLAR_NATIVE_ASSET_ID)).toBe(false);
  });
});

describe('isAssetRequireActivate', () => {
  it('returns false for non-trustline assets', () => {
    expect(
      isAssetRequireActivate({
        assetId: STELLAR_NATIVE_ASSET_ID,
        assetMetadata: undefined,
      }),
    ).toBe(false);
  });

  it('returns true when trustline metadata is missing', () => {
    expect(
      isAssetRequireActivate({
        assetId: STELLAR_USDC_ASSET_ID,
        assetMetadata: undefined,
      }),
    ).toBe(true);
  });

  it('returns true when trustline limit is zero', () => {
    expect(
      isAssetRequireActivate({
        assetId: STELLAR_USDC_ASSET_ID,
        assetMetadata: { limit: '0' },
      }),
    ).toBe(true);
  });

  it('returns false when trustline limit is set', () => {
    expect(
      isAssetRequireActivate({
        assetId: STELLAR_USDC_ASSET_ID,
        assetMetadata: { limit: '1000000' },
      }),
    ).toBe(false);
  });
});
