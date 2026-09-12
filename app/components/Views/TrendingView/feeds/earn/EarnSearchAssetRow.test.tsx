import React, { ComponentProps } from 'react';
import { EthAccountType } from '@metamask/keyring-api';
import { fireEvent, render } from '@testing-library/react-native';
import type { Asset } from '@metamask/assets-controllers';
import { strings } from '../../../../../../locales/i18n';
import type {
  EarnAssetId,
  EarnAssetMetadata,
  EarnExperience,
} from '../../../../UI/Earn/types/earnAssets';
import { EARN_EXPERIENCES } from '../../../../UI/Earn/constants/experiences';
import { rankEarnAssets } from '../../../../UI/Earn/utils/earnSection';
import type { EarnAssetSearchItem } from './earnSearchTypes';
import EarnSearchAssetRow from './EarnSearchAssetRow';
import { EarnSearchAssetRowTestIds } from './EarnSearchAssetRow.testIds';
import EarnAssetIcon from '../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon';

const mockEarnAssetIconAssets: ComponentProps<typeof EarnAssetIcon>['asset'][] =
  [];

function mockEarnAssetIcon({
  asset,
}: ComponentProps<typeof EarnAssetIcon>): null {
  mockEarnAssetIconAssets.push(asset);
  return null;
}

jest.mock('../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon', () => ({
  __esModule: true,
  default: mockEarnAssetIcon,
}));

const readyExperience = (
  rateType: 'APR' | 'APY',
  percentage = 4.2,
): EarnExperience => ({
  id: `earn:${rateType}`,
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate: {
    type: rateType,
    percentage,
    status: 'ready',
  },
  isFeeSubsidized: false,
});

const createAssetAddress = (symbol: string) =>
  `0x${Array.from(symbol)
    .map((character) => character.codePointAt(0)?.toString(16) ?? '0')
    .join('')
    .padEnd(40, '0')
    .slice(0, 40)}`;

const createHeldSearchAsset = (
  symbol: string,
  balance: string,
  rateType: 'APR' | 'APY' = 'APY',
) => {
  const address = createAssetAddress(symbol);
  const asset = {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: address,
    address,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    name: `${symbol} Coin`,
    symbol,
    balance,
    rawBalance: '0x1',
    fiat: {
      balance: Number(balance),
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  } as Asset;

  return {
    assetId: `eip155:1/erc20:${address.toLowerCase()}` as EarnAssetId,
    metadata: {
      address,
      chainId: '0x1',
      decimals: 6,
      image: `${symbol}.png`,
      name: `${symbol} Coin`,
      symbol,
      logo: `${symbol}.png`,
      isETH: false,
    },
    wallet: { status: 'tracked' as const, asset },
    experiences: [readyExperience(rateType)],
  };
};

const createDiscoverySearchAsset = (
  symbol: string,
  rateType: 'APR' | 'APY' = 'APY',
  metadataOverrides: Partial<EarnAssetMetadata> = {},
) => {
  const address = createAssetAddress(symbol);

  return {
    assetId: `eip155:1/erc20:${address.toLowerCase()}` as EarnAssetId,
    metadata: {
      address,
      chainId: '0x1',
      decimals: 6,
      image: `${symbol}.png`,
      name: `${symbol} Coin`,
      symbol,
      logo: `${symbol}.png`,
      isETH: false,
      ...metadataOverrides,
    },
    wallet: { status: 'untracked' as const },
    experiences: [
      {
        ...readyExperience(rateType),
        depositReadiness: {
          status: 'not_ready',
          reason: 'asset_not_tracked',
        } as const,
      },
    ],
  };
};

const createItem = (
  asset:
    | ReturnType<typeof createHeldSearchAsset>
    | ReturnType<typeof createDiscoverySearchAsset>,
): EarnAssetSearchItem => ({
  kind: 'asset',
  id: asset.assetId,
  asset: rankEarnAssets([asset])[0],
});

describe('EarnSearchAssetRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEarnAssetIconAssets.length = 0;
  });

  it('renders held asset name, balance, and Get APY copy', () => {
    const item = createItem(createHeldSearchAsset('USDC', '0.001'));

    const { getByTestId, getByText } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} />,
    );

    expect(getByText('USDC Coin')).toBeOnTheScreen();
    expect(getByTestId(EarnSearchAssetRowTestIds.BALANCE)).toHaveTextContent(
      '$0.00',
    );
    expect(
      getByText(strings('earn_module.get_rate_apy', { percentage: '4.2' })),
    ).toBeOnTheScreen();
  });

  it('renders discovery asset name, symbol, and APY copy', () => {
    const item = createItem(createDiscoverySearchAsset('USDT'));

    const { getByText } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} />,
    );

    expect(getByText('USDT Coin')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
    expect(
      getByText(strings('earn_module.rate_apy', { percentage: '4.2' })),
    ).toBeOnTheScreen();
  });

  it('renders Get APR copy for a held APR asset', () => {
    const item = createItem(createHeldSearchAsset('ETH', '1', 'APR'));

    const { getByText } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} />,
    );

    expect(
      getByText(strings('earn_module.get_rate_apr', { percentage: '4.2' })),
    ).toBeOnTheScreen();
  });

  it('passes normalized metadata to EarnAssetIcon without a wallet balance', () => {
    const item = createItem(createDiscoverySearchAsset('DAI'));

    render(<EarnSearchAssetRow item={item} onPress={jest.fn()} />);

    expect(mockEarnAssetIconAssets).toHaveLength(1);
    const [iconAsset] = mockEarnAssetIconAssets;
    expect(iconAsset).toBe(item.asset);
    expect(iconAsset.metadata).toEqual(item.asset.metadata);
    expect('balance' in iconAsset).toBe(false);
  });

  it('passes the asset item to onPress', () => {
    const item = createItem(createHeldSearchAsset('USDC', '0.001'));
    const onPress = jest.fn();

    const { getByTestId } = render(
      <EarnSearchAssetRow item={item} onPress={onPress} />,
    );

    fireEvent.press(getByTestId(EarnSearchAssetRowTestIds.ROW));

    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('masks a held asset fiat balance when privacy mode is enabled', () => {
    const item = createItem(createHeldSearchAsset('USDC', '10'));

    const { getByTestId, queryByText } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} privacyMode />,
    );

    expect(getByTestId(EarnSearchAssetRowTestIds.BALANCE)).toHaveTextContent(
      '•'.repeat(9),
    );
    expect(queryByText('$10.00')).not.toBeOnTheScreen();
  });
});
