import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Title from '../../../Base/Title';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './Balance.styles';
import AssetElement from '../../AssetElement';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { selectChainId } from '../../../../selectors/networkController';
import {
  getTestNetImageByChainId,
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
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import { isPooledStakingFeatureEnabled } from '../../Stake/constants';
import StakingBalance from '../../Stake/components/StakingBalance/StakingBalance';

interface BalanceProps {
  asset: TokenI;
  mainBalance: string;
  secondaryBalance?: string;
}

const NetworkBadgeSource = (chainId: string, ticker: string) => {
  const isMainnet = isMainnetByChainId(chainId);
  const isLineaMainnet = isLineaMainnetByChainId(chainId);

  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

  if (isMainnet) return images.ETHEREUM;

  if (isLineaMainnet) return images['LINEA-MAINNET'];

  return ticker ? images[ticker as keyof typeof images] : undefined;
};

const Balance = ({ asset, mainBalance, secondaryBalance }: BalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkName = useSelector(selectNetworkName);
  const chainId = useSelector(selectChainId);

  return (
    <View style={styles.wrapper}>
      <Title style={styles.title}>
        {strings('asset_overview.your_balance')}
      </Title>
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
              imageSource={NetworkBadgeSource(chainId, asset.symbol)}
              name={networkName}
            />
          }
        >
          {asset.isETH ? (
            <NetworkMainAssetLogo style={styles.ethLogo} />
          ) : (
            <AvatarToken
              name={asset.symbol}
              imageSource={{ uri: asset.image }}
              size={AvatarSize.Md}
            />
          )}
        </BadgeWrapper>
        <Text style={styles.balances} variant={TextVariant.BodyLGMedium}>
          {asset.name || asset.symbol}
        </Text>
      </AssetElement>
      {isPooledStakingFeatureEnabled() && asset?.isETH && <StakingBalance />}
    </View>
  );
};

export default Balance;
