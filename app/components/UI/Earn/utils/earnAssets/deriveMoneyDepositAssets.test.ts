import { EthAccountType } from '@metamask/keyring-api';
import type { Asset } from '@metamask/assets-controllers';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../../types/earnAssets';
import type { MoneyDepositAsset } from '../../../Money/selectors/depositTokens';
import { deriveMoneyDepositAssets } from './deriveMoneyDepositAssets';

const createExperience = (type: EarnExperience['type']): EarnExperience => ({
  id: `earn:${type}`,
  type,
  role: type === 'MONEY_ACCOUNT_DEPOSIT' ? 'funding' : 'underlying',
  rate: {
    type: 'APY',
    status: 'ready',
    percentage: 4.2,
  },
  isFeeSubsidized: false,
});

const createAsset = (index: number): MoneyDepositAsset =>
  ({
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: `0x${index.toString(16).padStart(40, '0')}`,
    address: `0x${index.toString(16).padStart(40, '0')}`,
    chainId: '0x1',
    decimals: 6,
    image: '',
    name: `Token ${index}`,
    symbol: `T${index}`,
    balance: '1',
    rawBalance: '0x1',
    fiat: {
      balance: index,
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  }) as MoneyDepositAsset;

const createHeldAsset = (
  asset: Asset,
  experiences: readonly EarnExperience[],
): EarnAsset => ({
  kind: 'held',
  assetId: `eip155:1/erc20:${asset.assetId}` as EarnAssetId,
  asset,
  experiences,
});

const createDiscoveryAsset = (): EarnAsset => ({
  kind: 'discovery',
  assetId:
    'eip155:1/erc20:0x0000000000000000000000000000000000000004' as EarnAssetId,
  metadata: {
    address: '0x0000000000000000000000000000000000000004',
    chainId: '0x1',
    decimals: 6,
    image: '',
    name: 'Discovery token',
    symbol: 'DISC',
    logo: undefined,
    isETH: false,
  },
  experiences: [createExperience('MONEY_ACCOUNT_DEPOSIT')],
});

describe('deriveMoneyDepositAssets', () => {
  it('returns held assets with Money deposit experiences in catalogue order', () => {
    const first = createAsset(1);
    const second = createAsset(2);
    const third = createAsset(3);
    const assets = [
      createHeldAsset(second, [createExperience('MONEY_ACCOUNT_DEPOSIT')]),
      createHeldAsset(first, [
        createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
        createExperience('MONEY_ACCOUNT_DEPOSIT'),
      ]),
      createHeldAsset(third, [createExperience('MONEY_ACCOUNT_DEPOSIT')]),
    ];

    const result = deriveMoneyDepositAssets(assets);

    expect(result).toEqual([second, first, third]);
  });

  it('excludes discovery assets and held assets without Money deposit experiences', () => {
    const moneyAsset = createAsset(1);
    const nonMoneyAsset = createAsset(2);
    const assets = [
      createDiscoveryAsset(),
      createHeldAsset(nonMoneyAsset, [
        createExperience(EARN_EXPERIENCES.POOLED_STAKING),
      ]),
      createHeldAsset(moneyAsset, [createExperience('MONEY_ACCOUNT_DEPOSIT')]),
    ];

    const result = deriveMoneyDepositAssets(assets);

    expect(result).toEqual([moneyAsset]);
  });
});
