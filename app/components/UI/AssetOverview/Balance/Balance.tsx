import { CaipAssetId, Hex, isCaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../util/networks';
import {
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
  PopularList,
  UnpopularNetworkList,
} from '../../../../util/networks/customNetworks';
import AssetElement from '../../AssetElement';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import StakingBalance from '../../Stake/components/StakingBalance/StakingBalance';
import { TokenI } from '../../Tokens/types';
import styleSheet from './Balance.styles';

interface BalanceProps {
  asset: TokenI;
  mainBalance: string;
  secondaryBalance?: string;
}

export const NetworkBadgeSource = (chainId: Hex) => {
  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
  const defaultNetwork = getDefaultNetworkByChainId(chainId) as
    | {
        imageSource: string;
      }
    | undefined;

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

  if (isCaipChainId(chainId)) {
    return getNonEvmNetworkImageSourceByChainId(chainId);
  }

  if (customNetworkImg) {
    return customNetworkImg;
  }
};

const Balance = ({ asset, mainBalance, secondaryBalance }: BalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const tokenChainId = asset.chainId;

  const renderNetworkAvatar = useCallback(() => {
    if (asset.isNative) {
      return (
        <NetworkAssetLogo
          chainId={asset.chainId as Hex}
          style={styles.ethLogo}
          ticker={asset.ticker ?? asset.symbol}
          big={false}
          biggest={false}
          testID={asset.name}
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
  }, [asset, styles.ethLogo]);

  const isDisabled = useMemo(
    () => asset.isNative || isCaipChainId(asset.chainId as CaipAssetId),
    [asset.chainId, asset.isNative],
  );

  const handlePress = useCallback(
    () =>
      !asset.isNative &&
      navigation.navigate('AssetDetails', {
        chainId: asset.chainId,
        address: asset.address,
      }),
    [asset.address, asset.chainId, asset.isNative, navigation],
  );

  return (
    <View style={styles.wrapper}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('asset_overview.your_balance')}
      </Text>
      <AssetElement
        disabled={isDisabled}
        asset={asset}
        balance={mainBalance}
        secondaryBalance={secondaryBalance}
        onPress={handlePress}
      >
        <BadgeWrapper
          style={styles.badgeWrapper}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={NetworkBadgeSource(tokenChainId as Hex)}
              name={networkConfigurationByChainId?.name}
            />
          }
        >
          {renderNetworkAvatar()}
        </BadgeWrapper>
        <Text style={styles.balances} variant={TextVariant.BodyLGMedium}>
          {asset.name || asset.symbol}
        </Text>
      </AssetElement>
      {asset?.isETH && <StakingBalance asset={asset} />}
    </View>
  );
};

export default Balance;
