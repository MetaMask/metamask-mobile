import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  CaipAssetId,
  CaipAssetType,
  Hex,
  isCaipChainId,
} from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './Balance.styles';
import AssetElement from '../../AssetElement';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  getDefaultNetworkByChainId,
  isTestNet,
} from '../../../../util/networks';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../util/networks/customNetworks';
import { RootState } from '../../../../reducers';
import EarnBalance from '../../Earn/components/EarnBalance';
import PercentageChange from '../../../../component-library/components-temp/Price/PercentageChange';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectPricePercentChange1d } from '../../../../selectors/tokenRatesController';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';

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

  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const evmPricePercentChange1d = useSelector((state: RootState) =>
    selectPricePercentChange1d(
      state,
      asset.chainId as Hex,
      asset?.isNative
        ? getNativeTokenAddress(asset.chainId as Hex)
        : (asset?.address as Hex),
    ),
  );
  const allMultichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const getPricePercentChange1d = () => {
    if (isEvmNetworkSelected) {
      return evmPricePercentChange1d;
    }
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    return allMultichainAssetsRates[asset?.address as CaipAssetType]?.marketData
      ?.pricePercentChange?.P1D;
    ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  };

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
        size={AvatarSize.Lg}
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
      <Text variant={TextVariant.HeadingMD}>
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

        <View style={styles.percentageChange}>
          <Text variant={TextVariant.BodyMD}>{asset.name || asset.symbol}</Text>

          <PercentageChange value={getPricePercentChange1d()} />
        </View>
      </AssetElement>
      <EarnBalance asset={asset} />
    </View>
  );
};

export default Balance;
