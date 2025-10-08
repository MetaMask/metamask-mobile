import React from 'react';
import { TokenI } from '../../../../../Tokens/types';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './Erc20TokenHero.styles';
import { View } from 'react-native';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import NetworkAssetLogo from '../../../../../NetworkAssetLogo';
import AvatarToken from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import { renderFromTokenMinimalUnit } from '../../../../../../../util/number/legacy';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import useFiatFormatter from '../../../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import BigNumber from 'bignumber.js';

const TokenAvatar = ({ token }: { token: TokenI }) => {
  const { styles } = useStyles(styleSheet, {});

  const testId = `earn-token-selector-${token.symbol}-${token.chainId}`;

  if (token.isNative) {
    return (
      <NetworkAssetLogo
        chainId={token.chainId ?? ''}
        ticker={token.ticker ?? ''}
        big={false}
        biggest={false}
        testID={testId}
        style={styles.networkAvatar}
      />
    );
  }

  return (
    <AvatarToken
      name={token.symbol}
      imageSource={{ uri: token.image }}
      size={AvatarSize.Xl}
      testID={testId}
    />
  );
};

const NetworkAndTokenImage = ({ token }: { token: TokenI }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.networkAndTokenContainer}>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            // @ts-expect-error The utils/network file is still JS and this function expects a networkType that should be optional
            imageSource={getNetworkImageSource({ chainId: token?.chainId })}
          />
        }
      >
        <TokenAvatar token={token} />
      </BadgeWrapper>
    </View>
  );
};

export interface Erc20TokenHeroProps {
  token: TokenI;
  amountTokenMinimalUnit: string;
  fiatValue: string;
}

const Erc20TokenHero = ({
  token,
  amountTokenMinimalUnit,
  fiatValue,
}: Erc20TokenHeroProps) => {
  const { styles } = useStyles(styleSheet, {});
  const fiatFormatter = useFiatFormatter();

  const displayTokenAmount = renderFromTokenMinimalUnit(
    amountTokenMinimalUnit,
    token.decimals,
  );

  return (
    <View style={styles.container}>
      <NetworkAndTokenImage token={token} />
      <View style={styles.assetAmountContainer}>
        <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
          {displayTokenAmount} {token.symbol}
        </Text>
        <Text
          style={styles.assetFiatConversionText}
          variant={TextVariant.BodyMD}
        >
          {fiatFormatter(new BigNumber(fiatValue))}
        </Text>
      </View>
    </View>
  );
};

export default Erc20TokenHero;
