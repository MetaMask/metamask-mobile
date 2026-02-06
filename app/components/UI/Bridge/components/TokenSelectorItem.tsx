import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  View,
  TouchableOpacity,
  Platform,
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
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { Box } from '../../Box/Box';
import { ethers } from 'ethers';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import StockBadge from '../../shared/StockBadge';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { BridgeToken } from '../types';
import { RootState } from '../../../../reducers';
import { fontStyles } from '../../../../styles/common';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../Tokens/constants';
import { selectNoFeeAssets } from '../../../../core/redux/slices/bridge';
import Tag from '../../../../component-library/components/Tags/Tag';
import { ACCOUNT_TYPE_LABELS } from '../../../../constants/account-type-labels';
import parseAmount from '../../../../util/parseAmount';
import { getTokenImageSource } from '../utils';
import { useRWAToken } from '../hooks/useRWAToken';

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
      paddingVertical: 4,
      paddingLeft: 16,
      paddingRight: 10,
    },
    selectedIndicator: {
      position: 'absolute',
      left: 4,
      top: 4,
      bottom: 4,
      width: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.primary.default,
    },
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
    skeleton: {
      width: 50,
      padding: 8,
      borderRadius: 30,
      backgroundColor: theme.colors.background.alternative,
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
    childrenWrapper: {
      marginLeft: 12,
    },
  });

interface TokenSelectorItemProps {
  token: BridgeToken;
  onPress: (token: BridgeToken) => void;
  networkName?: string;
  networkImageSource?: ImageSourcePropType;
  isSelected?: boolean;
  shouldShowBalance?: boolean;
  children?: React.ReactNode;
  isNoFeeAsset?: boolean;
}

const FiatBalanceView = ({
  balance,
  isSelected,
}: {
  balance?: string;
  isSelected: boolean;
}) => {
  const { styles } = useStyles(createStyles, { isSelected });

  if (!balance || balance === TOKEN_RATE_UNDEFINED) {
    return null;
  }

  if (
    balance === TOKEN_BALANCE_LOADING ||
    balance === TOKEN_BALANCE_LOADING_UPPERCASE
  ) {
    return <View style={styles.skeleton} />;
  }

  return <Text variant={TextVariant.BodyLGMedium}>{balance}</Text>;
};

export const TokenSelectorItem: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
  isSelected = false,
  shouldShowBalance = true,
  children,
  isNoFeeAsset = false,
}) => {
  const { styles } = useStyles(createStyles, { isSelected });
  const noFeeAssets = useSelector((state: RootState) =>
    selectNoFeeAssets(state, token.chainId),
  );

  const showNoFeeBadge = isNoFeeAsset || noFeeAssets?.includes(token.address);

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
  const { isStockToken } = useRWAToken();

  const balance = shouldShowBalance ? fiatValue : undefined;
  const secondaryBalance = shouldShowBalance ? balanceWithSymbol : undefined;

  const label = token.accountType
    ? ACCOUNT_TYPE_LABELS[token.accountType]
    : undefined;

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
            <AvatarToken
              name={token.symbol}
              imageSource={getTokenImageSource(token.symbol, token.image)}
              size={AvatarSize.Md}
              testID={
                isNative
                  ? `network-logo-${token.symbol}`
                  : `token-logo-${token.symbol}`
              }
            />
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
              gap={4}
            >
              <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
              {label && <Tag label={label} />}
              {showNoFeeBadge && (
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
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {token.name}
            </Text>
            {isStockToken(token) && <StockBadge token={token} />}
          </Box>

          {/* Token balance and fiat value */}
          <Box style={styles.balance} gap={4}>
            <FiatBalanceView balance={balance} isSelected={isSelected} />
            {secondaryBalance ? (
              secondaryBalance === TOKEN_BALANCE_LOADING ||
              secondaryBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <View style={styles.skeleton} />
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

      <View style={styles.childrenWrapper}>{children}</View>
    </Box>
  );
};
