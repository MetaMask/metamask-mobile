import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import TokenIcon from '../../Swaps/components/TokenIcon';
import { Box } from '../../Box/Box';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { BridgeToken } from '../types';
import { ethers } from 'ethers';
import { fontStyles } from '../../../../styles/common';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../Tokens/constants';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import SkeletonText from '../../Ramp/Aggregator/components/SkeletonText';
import parseAmount from '../../Ramp/Aggregator/utils/parseAmount';

const createStyles = ({
  theme,
  vars,
}: {
  theme: Theme;
  vars: { isSelected: boolean };
}) =>
  StyleSheet.create({
    tokenInfo: {
      flex: 1,
      marginLeft: 8,
    },
    container: {
      backgroundColor: vars.isSelected
        ? theme.colors.primary.muted
        : theme.colors.background.default,
      padding: 4,
    },
    selectedIndicator: {
      width: 4,
      height: '100%',
      borderRadius: 8,
      backgroundColor: theme.colors.primary.default,
    },
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
    skeleton: {
      width: 50,
    },
    secondaryBalance: {
      color: theme.colors.text.alternative,
      paddingHorizontal: 0,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    badgeWrapper: {
      // override the BadgeWrapper alignSelf: 'flex-start', let parent control the alignment
      alignSelf: undefined,
    },
  });

interface TokenSelectorItemProps {
  token: BridgeToken;
  onPress: (token: BridgeToken) => void;
  networkName: string;
  networkImageSource?: ImageSourcePropType;
  isSelected?: boolean;
  shouldShowBalance?: boolean;
  children?: React.ReactNode;
}

export const TokenSelectorItem: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
  isSelected = false,
  shouldShowBalance = true,
  children,
}) => {
  const { styles } = useStyles(createStyles, { isSelected });
  const fiatValue = token.balanceFiat;

  // TODO format using intlFormatter
  const balanceWithSymbol = token.balance
    ? `${
        Number(token.balance) < 0.00001
          ? '< 0.00001'
          : parseAmount(token.balance, 5)
      } ${token.symbol}`
    : undefined;

  const isNative = token.address === ethers.constants.AddressZero;

  const balance = shouldShowBalance ? fiatValue : undefined;
  const secondaryBalance = shouldShowBalance ? balanceWithSymbol : undefined;

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      {isSelected && <View style={styles.selectedIndicator} />}

      <TouchableOpacity
        key={token.address}
        onPress={() => onPress(token)}
        style={styles.itemWrapper}
        {...generateTestId(
          Platform,
          getAssetTestId(`${token.chainId}-${token.symbol}`),
        )}
      >
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={4}
        >
          {/* Token Icon */}
          <BadgeWrapper
            style={styles.badgeWrapper}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                name={networkName}
                imageSource={networkImageSource}
              />
            }
          >
            {isNative ? (
              <TokenIcon
                symbol={token.symbol}
                icon={token.image}
                medium
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

          {/* Token symbol and name */}
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

          {/* Token balance and fiat value */}
          <Box style={styles.balance} gap={4}>
            {balance &&
              (balance === TOKEN_BALANCE_LOADING ||
              balance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <SkeletonText thin style={styles.skeleton} />
              ) : (
                <Text variant={TextVariant.BodyLGMedium}>{balance}</Text>
              ))}
            {secondaryBalance ? (
              secondaryBalance === TOKEN_BALANCE_LOADING ||
              secondaryBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <SkeletonText thin style={styles.skeleton} />
              ) : (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {secondaryBalance}
                </Text>
              )
            ) : null}
          </Box>
        </Box>
      </TouchableOpacity>

      {children}
    </Box>
  );
};
