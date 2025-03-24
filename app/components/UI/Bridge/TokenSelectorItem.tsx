import React from 'react';
import { StyleSheet, ImageSourcePropType } from 'react-native';
import AssetElement from '../AssetElement';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import TokenIcon from '../Swaps/components/TokenIcon';
import { Box } from '../Box/Box';
import { FlexDirection } from '../Box/box.types';
import { TokenIWithFiatAmount } from './useSourceTokens';

const createStyles = () =>
  StyleSheet.create({
    tokenIcon: {
      width: 40,
      height: 40,
    },
    tokenInfo: {
      flex: 1,
      marginLeft: 8,
    },
  });

interface TokenSelectorItemProps {
  token: TokenIWithFiatAmount;
  onPress: (token: TokenIWithFiatAmount) => void;
  networkName: string;
  networkImageSource?: ImageSourcePropType;
}

export const TokenSelectorItem: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
}) => {
  const styles = createStyles();

  const fiatValue = token.balanceFiat;
  const balanceWithSymbol = `${token.balance} ${token.symbol}`;

  return (
    <AssetElement
      key={token.address}
      asset={token}
      onPress={() => onPress(token)}
      balance={fiatValue}
      secondaryBalance={balanceWithSymbol}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={networkImageSource}
          />
        }
      >
        {token.isNative ? (
          <TokenIcon
            symbol={token.symbol}
            icon={token.image}
            style={styles.tokenIcon}
            big={false}
            biggest={false}
            testID={`network-logo-${token.symbol}`}
          />
        ) : (
          <AvatarToken
            name={token.symbol}
            imageSource={token.image ? { uri: token.image } : undefined}
            size={AvatarSize.Md}
          />
        )}
      </BadgeWrapper>
      <Box
        style={styles.tokenInfo}
        flexDirection={FlexDirection.Column}
        gap={4}
      >
        <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {token.name}
        </Text>
      </Box>
    </AssetElement>
  );
};
