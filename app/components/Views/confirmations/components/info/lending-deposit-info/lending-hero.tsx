import React from 'react';
import { View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useStyles } from '../../../../../../component-library/hooks';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import styleSheet from './lending-hero.styles';
import { useLendingDepositDetails } from './useLendingDepositDetails';
import { TokenI } from '../../../../../UI/Tokens/types';

const TokenAvatar = ({ token }: { token: Partial<TokenI> }) => {
  const { styles } = useStyles(styleSheet, {});

  const testId = `earn-token-selector-${token.symbol}-${token.chainId}`;

  if (token.isNative) {
    return (
      <NetworkAssetLogo
        chainId={token.chainId ?? ''}
        ticker={token.symbol ?? ''}
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
      imageSource={token.image ? { uri: token.image } : undefined}
      size={AvatarSize.Xl}
      testID={testId}
    />
  );
};

const NetworkAndTokenImage = ({ token }: { token: Partial<TokenI> }) => {
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

const LendingHero = () => {
  const { styles } = useStyles(styleSheet, {});
  const details = useLendingDepositDetails();
  const fiatFormatter = useFiatFormatter();

  if (!details) {
    return null;
  }

  const { token, amountMinimalUnit, tokenDecimals, tokenFiat } = details;

  const displayTokenAmount = renderFromTokenMinimalUnit(
    amountMinimalUnit,
    tokenDecimals,
  );

  // Format fiat using the fiat formatter (handles locale, currency symbol, etc.)
  const formattedFiat = fiatFormatter(new BigNumber(tokenFiat));

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
          {formattedFiat}
        </Text>
      </View>
    </View>
  );
};

export default LendingHero;
