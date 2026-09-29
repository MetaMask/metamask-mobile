import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
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
  depositReadiness: { status: 'ready' },
  isFeeSubsidized: false,
});

const createAsset = (
  index: number,
  overrides: Partial<MoneyDepositAsset> = {},
): MoneyDepositAsset =>
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
    ...overrides,
  }) as MoneyDepositAsset;

const createTrackedAsset = (
  asset: MoneyDepositAsset,
  experiences: readonly EarnExperience[],
): EarnAsset => ({
  assetId: `eip155:1/erc20:${asset.assetId}` as EarnAssetId,
  metadata: {
    address: asset.address,
    chainId: asset.chainId,
    decimals: asset.decimals,
    image: asset.image,
    name: asset.name,
    symbol: asset.symbol,
    ticker: asset.symbol,
    logo: asset.image,
    isNative: asset.isNative,
    isETH: false,
    isStaked: false,
  },
  wallet: { status: 'tracked', asset },
  experiences,
});

const createUntrackedAsset = (): EarnAsset => ({
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
  wallet: { status: 'untracked' },
  experiences: [createExperience('MONEY_ACCOUNT_DEPOSIT')],
});

describe('deriveMoneyDepositAssets', () => {
  it('returns tracked assets with ready Money deposit experiences in catalogue order', () => {
    const first = createAsset(1);
    const second = createAsset(2);
    const third = createAsset(3);
    const assets = [
      createTrackedAsset(second, [createExperience('MONEY_ACCOUNT_DEPOSIT')]),
      createTrackedAsset(first, [
        createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
        createExperience('MONEY_ACCOUNT_DEPOSIT'),
      ]),
      createTrackedAsset(third, [createExperience('MONEY_ACCOUNT_DEPOSIT')]),
    ];

    const result = deriveMoneyDepositAssets(assets);

    expect(result).toEqual([second, first, third]);
  });

  it('excludes untracked assets and tracked assets without Money deposit experiences', () => {
    const moneyAsset = createAsset(1);
    const nonMoneyAsset = createAsset(2);
    const assets = [
      createUntrackedAsset(),
      createTrackedAsset(nonMoneyAsset, [
        createExperience(EARN_EXPERIENCES.POOLED_STAKING),
      ]),
      createTrackedAsset(moneyAsset, [
        createExperience('MONEY_ACCOUNT_DEPOSIT'),
      ]),
    ];

    const result = deriveMoneyDepositAssets(assets);

    expect(result).toEqual([moneyAsset]);
  });

  it('excludes tracked assets with a non-ready Money deposit experience', () => {
    const asset = createAsset(1);
    const earnAsset = createTrackedAsset(asset, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const notReadyEarnAsset: EarnAsset = {
      ...earnAsset,
      experiences: [
        {
          ...earnAsset.experiences[0],
          depositReadiness: {
            status: 'not_ready',
            reason: 'insufficient_balance',
          },
        },
      ],
    };

    const result = deriveMoneyDepositAssets([notReadyEarnAsset]);

    expect(result).toEqual([]);
  });

  it('excludes tracked assets without an EVM address', () => {
    const asset = createAsset(1);
    const assetWithoutAddress = { ...asset };
    Reflect.deleteProperty(assetWithoutAddress, 'address');
    const earnAsset = createTrackedAsset(assetWithoutAddress, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);

    const result = deriveMoneyDepositAssets([earnAsset]);

    expect(result).toEqual([]);
  });

  it('excludes tracked assets without a chain ID', () => {
    const asset = createAsset(1);
    const assetWithoutChainId = { ...asset };
    Reflect.deleteProperty(assetWithoutChainId, 'chainId');
    const earnAsset = createTrackedAsset(assetWithoutChainId, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);

    const result = deriveMoneyDepositAssets([earnAsset]);

    expect(result).toEqual([]);
  });

  it('excludes tracked assets with an empty chain ID', () => {
    const asset = createAsset(1, {
      chainId: '' as MoneyDepositAsset['chainId'],
    });
    const earnAsset = createTrackedAsset(asset, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);

    const result = deriveMoneyDepositAssets([earnAsset]);

    expect(result).toEqual([]);
  });

  it('excludes tracked assets with an empty address', () => {
    const asset = createAsset(1, {
      address: '' as MoneyDepositAsset['address'],
    });
    const earnAsset = createTrackedAsset(asset, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);

    const result = deriveMoneyDepositAssets([earnAsset]);

    expect(result).toEqual([]);
  });

  it('excludes tracked assets from non-EVM account types', () => {
    const asset = createAsset(1, {
      accountType: SolAccountType.DataAccount,
    });
    const earnAsset = createTrackedAsset(asset, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);

    const result = deriveMoneyDepositAssets([earnAsset]);

    expect(result).toEqual([]);
  });
});
