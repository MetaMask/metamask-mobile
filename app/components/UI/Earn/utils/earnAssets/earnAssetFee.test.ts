import { EARN_EXPERIENCES } from '../../constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../../types/earnAssets';
import { hasEarnAssetSubsidizedFee } from './earnAssetFee';

const ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;

const createExperience = (
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id: 'experience',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate: { type: 'APY', status: 'ready', percentage: 4.2 },
  isFeeSubsidized: false,
  ...overrides,
});

const createAsset = (experiences: readonly EarnExperience[]): EarnAsset => ({
  assetId: ASSET_ID,
  metadata: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    logo: 'usdc.png',
    isETH: false,
  },
  wallet: { status: 'untracked' },
  experiences,
});

describe('hasEarnAssetSubsidizedFee', () => {
  it('returns true when a ready experience has a subsidized fee', () => {
    const asset = createAsset([
      createExperience({
        isFeeSubsidized: true,
      }),
    ]);

    const result = hasEarnAssetSubsidizedFee(asset);

    expect(result).toBe(true);
  });

  it('returns false when a subsidized experience is not ready', () => {
    const asset = createAsset([
      createExperience({
        depositReadiness: {
          status: 'not_ready',
          reason: 'insufficient_balance',
        },
        isFeeSubsidized: true,
      }),
    ]);

    const result = hasEarnAssetSubsidizedFee(asset);

    expect(result).toBe(false);
  });

  it('returns false when ready experiences are not subsidized', () => {
    const asset = createAsset([createExperience()]);

    const result = hasEarnAssetSubsidizedFee(asset);

    expect(result).toBe(false);
  });

  it('returns true when a later ready experience has a subsidized fee', () => {
    const asset = createAsset([
      createExperience({
        id: 'lending:usdc',
        isFeeSubsidized: false,
      }),
      createExperience({
        id: 'money:usdc',
        type: 'MONEY_ACCOUNT_DEPOSIT',
        role: 'funding',
        isFeeSubsidized: true,
      }),
    ]);

    const result = hasEarnAssetSubsidizedFee(asset);

    expect(result).toBe(true);
  });

  it('returns false when an asset has no experiences', () => {
    const asset = createAsset([]);

    const result = hasEarnAssetSubsidizedFee(asset);

    expect(result).toBe(false);
  });
});
