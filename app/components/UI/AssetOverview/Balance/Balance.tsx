import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './Balance.styles';
import AssetElement from '../../AssetElement';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { selectChainId } from '../../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  getDefaultNetworkByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
} from '../../../../util/networks';
import images from '../../../../images/image-icons';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import NetworkMainAssetLogo from '../../NetworkMainAssetLogo';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import { isPooledStakingFeatureEnabled } from '../../Stake/constants';
import StakingBalance from '../../Stake/components/StakingBalance/StakingBalance';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
} from '../../../../util/networks/customNetworks';

interface BalanceProps {
  asset: TokenI;
  mainBalance: string;
  secondaryBalance?: string;
}

const isPortfolioViewEnabled = process.env.PORTFOLIO_VIEW === 'true';

export const NetworkBadgeSource = (chainId: Hex, ticker: string) => {
  const isMainnet = isMainnetByChainId(chainId);
  const isLineaMainnet = isLineaMainnetByChainId(chainId);
  if (!isPortfolioViewEnabled) {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
    if (isMainnet) return images.ETHEREUM;

    if (isLineaMainnet) return images['LINEA-MAINNET'];

    if (CustomNetworkImgMapping[chainId]) {
      return CustomNetworkImgMapping[chainId];
    }

    return ticker ? images[ticker as keyof typeof images] : undefined;
  }
  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultNetwork = getDefaultNetworkByChainId(chainId) as any;

  if (defaultNetwork) {
    return defaultNetwork.imageSource;
  }

  const unpopularNetwork = UnpopularNetworkList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const customNetworkImg = CustomNetworkImgMapping[chainId];

  const popularNetwork = PopularList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const network = unpopularNetwork || popularNetwork;
  if (network) {
    return network.rpcPrefs.imageSource;
  }
  if (customNetworkImg) {
    return customNetworkImg;
  }
};

const Balance = ({ asset, mainBalance, secondaryBalance }: BalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkName = useSelector(selectNetworkName);
  const selectedChainId = useSelector(selectChainId);

  const chainId = isPortfolioViewEnabled
    ? (asset.chainId as Hex)
    : selectedChainId;

  const isMainnet = isMainnetByChainId(chainId);
  const isLineaMainnet = isLineaMainnetByChainId(chainId);
  const ticker = asset.symbol;

  const renderNetworkAvatar = useCallback(() => {
    if (!isPortfolioViewEnabled && asset.isETH) {
      return <NetworkMainAssetLogo style={styles.ethLogo} />;
    }

    if (isPortfolioViewEnabled && asset.isNative) {
      return (
        <NetworkAssetLogo
          chainId={asset.chainId as Hex}
          style={styles.ethLogo}
          ticker={asset.symbol}
          big={false}
          biggest={false}
          testID={'PLACE HOLDER'}
        />
      );
    }

    return (
      <AvatarToken
        name={asset.symbol}
        imageSource={{ uri: asset.image }}
        size={AvatarSize.Md}
      />
    );
  }, [
    asset.isETH,
    asset.image,
    asset.symbol,
    asset.isNative,
    asset.chainId,
    styles.ethLogo,
  ]);

  return (
    <View style={styles.wrapper}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('asset_overview.your_balance')}
      </Text>
      <AssetElement
        asset={asset}
        mainBalance={mainBalance}
        balance={secondaryBalance}
        onPress={() => !asset.isETH && navigation.navigate('AssetDetails')}
      >
        <BadgeWrapper
          style={styles.badgeWrapper}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={NetworkBadgeSource(chainId, ticker)}
              name={networkName}
            />
          }
        >
          {renderNetworkAvatar()}
        </BadgeWrapper>
        <Text style={styles.balances} variant={TextVariant.BodyLGMedium}>
          {asset.name || asset.symbol}
        </Text>
      </AssetElement>
      {isPooledStakingFeatureEnabled() && asset?.isETH && (
        <StakingBalance asset={asset} />
      )}
    </View>
  );
};

export default Balance;
