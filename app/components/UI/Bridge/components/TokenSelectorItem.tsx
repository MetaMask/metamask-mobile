import { ethers } from 'ethers';
import React from 'react';
import {
  ImageSourcePropType,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAssetTestId } from '../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../component-library/base-components/TagBase';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { selectNoFeeAssets } from '../../../../core/redux/slices/bridge';
import { RootState } from '../../../../reducers';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';
import { Box } from '../../Box/Box';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import SkeletonText from '../../Ramp/Aggregator/components/SkeletonText';
import parseAmount from '../../Ramp/Aggregator/utils/parseAmount';
import TokenIcon from '../../Swaps/components/TokenIcon';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../Tokens/constants';
import { useRWAToken } from '../hooks/useRWAToken';
import { BridgeToken } from '../types';

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
    noFeeBadge: {
      marginLeft: 8,
      paddingHorizontal: 6,
    },
    stockBadge: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
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
  const noFeeAssets = useSelector((state: RootState) =>
    selectNoFeeAssets(state, token.chainId),
  );

  const isNoFeeAsset = noFeeAssets?.includes(token.address);

  const fiatValue = token.balanceFiat;

  const formatTokenBalance = (balance: string): string => {
    const numericBalance = Number(balance);
    if (numericBalance === 0) {
      return '0';
    }
    if (numericBalance < 0.00001) {
      return '< 0.00001';
    }
    return parseAmount(balance, 5) || balance;
  };

  const balanceWithSymbol = token.balance
    ? `${formatTokenBalance(token.balance)} ${token.symbol}`
    : undefined;

  const isNative = token.address === ethers.constants.AddressZero;

  // to check if the token is a stock by checking if the name includes 'ondo' or 'stock'
  const { isStockToken } = useRWAToken({ token: token as BridgeToken });

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
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
            >
              <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
              {isNoFeeAsset && (
                <TagBase
                  shape={TagShape.Rectangle}
                  severity={TagSeverity.Info}
                  textProps={{ variant: TextVariant.BodyXS }}
                  style={styles.noFeeBadge}
                >
                  {strings('bridge.no_mm_fee')}
                </TagBase>
              )}
            </Box>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {token.name}
            </Text>
            {isStockToken() && (
              <View style={styles.stockBadge}>
                <Text variant={TextVariant.BodyXS} color={TextColor.Default}>
                  {strings('token.stock')}
                </Text>
              </View>
            )}
          </Box>

          {/* Token balance and fiat value */}
          <Box style={styles.balance}>
            {balance &&
              (balance === TOKEN_BALANCE_LOADING ||
              balance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <SkeletonText thin style={styles.skeleton} />
              ) : (
                <Text>{balance}</Text>
              ))}
            {secondaryBalance ? (
              secondaryBalance === TOKEN_BALANCE_LOADING ||
              secondaryBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <SkeletonText thin style={styles.skeleton} />
              ) : (
                <Text>{secondaryBalance}</Text>
              )
            ) : null}
          </Box>
        </Box>
      </TouchableOpacity>

      {children}
    </Box>
  );
};
