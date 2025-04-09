import React from 'react';
import { StyleSheet, ImageSourcePropType, View } from 'react-native';
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
import { AlignItems, FlexDirection, JustifyContent } from '../Box/box.types';
import { TokenIWithFiatAmount } from './useTokensWithBalance';
import ButtonIcon, { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import { IconColor, IconName } from '../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';

const createStyles = ({ theme, vars }: { theme: Theme, vars: { isSelected: boolean } }) =>
  StyleSheet.create({
    tokenIcon: {
      width: 40,
      height: 40,
    },
    tokenInfo: {
      flex: 1,
      marginLeft: 8,
    },
    infoButton: {
      marginRight: 12,
    },
    container: {
      backgroundColor: vars.isSelected ? theme.colors.primary.muted : theme.colors.background.default,
      padding: 4,
    },
    selectedIndicator: {
      width: 4,
      height: '100%',
      borderRadius: 8,
      backgroundColor: theme.colors.primary.default,
    },
  });

interface TokenSelectorItemProps {
  token: TokenIWithFiatAmount;
  onPress: (token: TokenIWithFiatAmount) => void;
  networkName: string;
  networkImageSource?: ImageSourcePropType;
  shouldShowBalance?: boolean;
  isSelected?: boolean;
}

export const TokenSelectorItem: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
  shouldShowBalance = true,
  isSelected = false,
}) => {
  const { styles } = useStyles(createStyles, { isSelected });
  const navigation = useNavigation();
  const fiatValue = token.balanceFiat;
  const balanceWithSymbol = `${token.balance} ${token.symbol}`;

  // Open the asset details screen as a bottom sheet
  const handleInfoButtonPress = () => navigation.navigate('Asset', { ...token });

  return (
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      {isSelected && <View style={styles.selectedIndicator} />}

      <AssetElement
        key={token.address}
        asset={token}
        onPress={() => onPress(token)}
        balance={shouldShowBalance ? fiatValue : undefined}
        secondaryBalance={shouldShowBalance ? balanceWithSymbol : undefined}
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
        <Box style={styles.tokenInfo} flexDirection={FlexDirection.Column} gap={4}>
          <Text variant={TextVariant.BodyLGMedium}>
            {token.symbol}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {token.name}
          </Text>
        </Box>
      </AssetElement>
      {!shouldShowBalance && (
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSizes.Md}
          onPress={handleInfoButtonPress}
          iconColor={IconColor.Alternative}
          style={styles.infoButton}
          testID="token-info-button"
        />
      )}
    </Box>
  );
};
