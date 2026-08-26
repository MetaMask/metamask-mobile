import React from 'react';
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

jest.mock('@metamask/design-system-react-native', () => {
  const {
    Pressable,
    Text: TextComponent,
    View,
  } = jest.requireActual('react-native');

  return {
    Box: ({ children, ...props }: React.ComponentProps<typeof View>) => (
      <View {...props}>{children}</View>
    ),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    ButtonBase: ({
      children,
      ...props
    }: React.ComponentProps<typeof Pressable>) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    FontWeight: { Medium: '500' },
    Text: ({
      children,
      ...props
    }: React.ComponentProps<typeof TextComponent>) => (
      <TextComponent {...props}>{children}</TextComponent>
    ),
    TextColor: {
      TextAlternative: 'text-alternative',
      TextDefault: 'text-default',
    },
    TextVariant: { BodyMd: 'body-md', BodySm: 'body-sm' },
  };
});

jest.mock('../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon', () => {
  const { Text } = jest.requireActual('react-native');

  return ({ token }: { token: { chainId?: string } }) => (
    <Text testID="earn-search-asset-network-badge">{token.chainId}</Text>
  );
});

const readyExperience = (
  rateType: 'APR' | 'APY',
  percentage = 4.2,
): EarnExperience => ({
  id: `earn:${rateType}`,
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  rate: {
    type: rateType,
    percentage,
    status: 'ready',
  },
  isFeeSubsidized: false,
});

const createHeldSearchAsset = (
  symbol: string,
  balance: string,
  rateType: 'APR' | 'APY' = 'APY',
) => {
  const asset = {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
    address: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
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
    kind: 'held' as const,
    assetId: `eip155:1/erc20:${symbol.toLowerCase()}` as EarnAssetId,
    asset,
    experiences: [readyExperience(rateType)],
  };
};

const createDiscoverySearchAsset = (
  symbol: string,
  rateType: 'APR' | 'APY' = 'APY',
  metadataOverrides: Partial<EarnAssetMetadata> = {},
) => ({
  kind: 'discovery' as const,
  assetId: `eip155:1/erc20:${symbol.toLowerCase()}` as EarnAssetId,
  metadata: {
    address: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    name: `${symbol} Coin`,
    symbol,
    logo: `${symbol}.png`,
    isETH: false,
    ...metadataOverrides,
  },
  experiences: [readyExperience(rateType)],
});

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
  it('renders held asset name, token amount, and Get APY copy', () => {
    const item = createItem(createHeldSearchAsset('USDC', '0.001'));

    const { getByText } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} />,
    );

    expect(getByText('USDC Coin')).toBeOnTheScreen();
    expect(getByText('0.001 USDC')).toBeOnTheScreen();
    expect(
      getByText(strings('earn_module.get_rate_apy', { percentage: '4.2' })),
    ).toBeOnTheScreen();
  });

  it('renders discovery asset name, zero token amount, and APY copy', () => {
    const item = createItem(createDiscoverySearchAsset('USDT'));

    const { getByText } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} />,
    );

    expect(getByText('USDT Coin')).toBeOnTheScreen();
    expect(getByText('0 USDT')).toBeOnTheScreen();
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

  it('renders the network badge through EarnAssetIcon', () => {
    const item = createItem(createDiscoverySearchAsset('DAI'));

    const { getByTestId } = render(
      <EarnSearchAssetRow item={item} onPress={jest.fn()} />,
    );

    expect(getByTestId('earn-search-asset-network-badge')).toHaveTextContent(
      '0x1',
    );
  });

  it('passes the asset item to onPress', () => {
    const item = createItem(createHeldSearchAsset('USDC', '0.001'));
    const onPress = jest.fn();

    const { getByTestId } = render(
      <EarnSearchAssetRow item={item} onPress={onPress} />,
    );

    fireEvent.press(getByTestId('earn-search-asset-row'));

    expect(onPress).toHaveBeenCalledWith(item);
  });
});
