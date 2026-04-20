import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  View,
  TouchableOpacity,
  Platform,
  StyleProp,
  TextStyle,
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
import { AlignItems, FlexDirection, JustifyContent } from '../../Box/box.types';
import StockBadge from '../../shared/StockBadge';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { BridgeToken } from '../types';
import { SecurityDataType } from '../hooks/usePopularTokens';
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
import { useABTest } from '../../../../hooks';
import {
  TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
  TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
  TokenSelectorBalanceLayoutVariant,
} from './TokenSelectorItem.abTestConfig';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

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
      flexShrink: 1,
      minWidth: 0,
      marginLeft: 12,
    },
    container: {
      backgroundColor: vars.isSelected
        ? theme.colors.primary.muted
        : theme.colors.background.default,
      paddingVertical: 4,
      minHeight: 72,
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
      paddingVertical: 12,
      alignItems: 'flex-start',
    },
    tokenMainInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
      marginRight: 8,
    },
    tokenSymbolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
    },
    tokenSymbol: {
      flexShrink: 1,
      minWidth: 0,
    },
    verifiedIcon: {
      marginLeft: 4,
      flexShrink: 0,
    },
    rightValue: {
      flexShrink: 0,
      textAlign: 'right',
    },
    tokenName: {
      flexShrink: 1,
      minWidth: 0,
      marginRight: 8,
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

const isLoadingBalance = (balance?: string) =>
  balance === TOKEN_BALANCE_LOADING ||
  balance === TOKEN_BALANCE_LOADING_UPPERCASE;

export const getSecurityTag = (securityType: SecurityDataType | undefined) => {
  if (
    securityType === SecurityDataType.Warning ||
    securityType === SecurityDataType.Spam
  ) {
    return {
      severity: TagSeverity.Warning,
      label: strings('bridge.token_suspicious'),
      iconName: IconName.Danger,
      iconColor: IconColor.WarningDefault,
    };
  }
  if (securityType === SecurityDataType.Malicious) {
    return {
      severity: TagSeverity.Danger,
      label: strings('bridge.token_malicious'),
      iconName: IconName.Warning,
      iconColor: IconColor.ErrorDefault,
    };
  }
  return null;
};

const FiatBalanceView = ({
  balance,
  isSelected,
  textStyle,
  textVariant,
  textColor,
}: {
  balance?: string;
  isSelected: boolean;
  textStyle?: StyleProp<TextStyle>;
  textVariant: TextVariant;
  textColor: TextColor;
}) => {
  const { styles } = useStyles(createStyles, { isSelected });

  if (!balance || balance === TOKEN_RATE_UNDEFINED) {
    return null;
  }

  if (isLoadingBalance(balance)) {
    return <View style={styles.skeleton} />;
  }

  return (
    <Text
      variant={textVariant}
      color={textColor}
      numberOfLines={1}
      style={textStyle}
    >
      {balance}
    </Text>
  );
};

const TokenBalanceView = ({
  balance,
  isSelected,
  textStyle,
  textVariant,
  textColor,
}: {
  balance?: string;
  isSelected: boolean;
  textStyle?: StyleProp<TextStyle>;
  textVariant: TextVariant;
  textColor: TextColor;
}) => {
  const { styles } = useStyles(createStyles, { isSelected });

  if (!balance) {
    return null;
  }

  if (isLoadingBalance(balance)) {
    return <View style={styles.skeleton} />;
  }

  return (
    <Text
      variant={textVariant}
      color={textColor}
      numberOfLines={1}
      style={textStyle}
    >
      {balance}
    </Text>
  );
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
  const { variant } = useABTest(
    TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
    TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
  );
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

  const selectedVariant =
    variant ??
    TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS[
      TokenSelectorBalanceLayoutVariant.Control
    ];
  const formattedTokenBalance = token.balance
    ? formatTokenBalance(token.balance)
    : undefined;
  const cryptoBalance = formattedTokenBalance
    ? selectedVariant.removeTickerFromTokenBalance
      ? formattedTokenBalance
      : `${formattedTokenBalance} ${token.symbol}`
    : undefined;

  const isNative = token.address === ethers.constants.AddressZero;

  // to check if the token is a stock by checking if the name includes 'ondo' or 'stock'
  const { isStockToken } = useRWAToken();

  const fiatBalance = shouldShowBalance ? fiatValue : undefined;
  const tokenBalance = shouldShowBalance ? cryptoBalance : undefined;
  const topRowBalanceTextStyle = {
    textVariant: TextVariant.BodyMDMedium,
    textColor: TextColor.Default,
  };
  const bottomRowBalanceTextStyle = {
    textVariant: TextVariant.BodySM,
    textColor: TextColor.Alternative,
  };

  const label = token.accountType
    ? ACCOUNT_TYPE_LABELS[token.accountType]
    : undefined;

  const securityTag = getSecurityTag(token.securityData?.type);

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
              size={AvatarSize.Lg}
              testID={
                isNative
                  ? `network-logo-${token.symbol}`
                  : `token-logo-${token.symbol}`
              }
            />
          </BadgeWrapper>

          {/* Token symbol/name on the left, balances on the right (extension layout pattern) */}
          <Box
            style={styles.tokenInfo}
            flexDirection={FlexDirection.Column}
            gap={4}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.spaceBetween}
            >
              <Box style={styles.tokenMainInfo} gap={4}>
                <Box style={styles.tokenSymbolRow}>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.tokenSymbol}
                  >
                    {token.symbol}
                  </Text>
                  {token.isVerified && (
                    <Icon
                      testID={`token-verified-icon-${token.symbol}`}
                      name={IconName.VerifiedFilled}
                      size={IconSize.Sm}
                      color={IconColor.InfoDefault}
                      style={styles.verifiedIcon}
                    />
                  )}
                  {securityTag && (
                    <TagBase
                      shape={TagShape.Pill}
                      severity={securityTag.severity}
                      startAccessory={
                        <Icon
                          name={securityTag.iconName}
                          size={IconSize.Sm}
                          color={securityTag.iconColor}
                        />
                      }
                      textProps={{ variant: TextVariant.BodySM }}
                      style={styles.verifiedIcon}
                    >
                      {securityTag.label}
                    </TagBase>
                  )}
                </Box>
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

              {selectedVariant.showTokenBalanceFirst ? (
                <TokenBalanceView
                  balance={tokenBalance}
                  isSelected={isSelected}
                  textStyle={styles.rightValue}
                  {...topRowBalanceTextStyle}
                />
              ) : (
                <FiatBalanceView
                  balance={fiatBalance}
                  isSelected={isSelected}
                  textStyle={styles.rightValue}
                  {...topRowBalanceTextStyle}
                />
              )}
            </Box>

            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.spaceBetween}
            >
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.tokenName}
              >
                {token.name}
              </Text>

              {selectedVariant.showTokenBalanceFirst ? (
                <FiatBalanceView
                  balance={fiatBalance}
                  isSelected={isSelected}
                  textStyle={styles.rightValue}
                  {...bottomRowBalanceTextStyle}
                />
              ) : (
                <TokenBalanceView
                  balance={tokenBalance}
                  isSelected={isSelected}
                  textStyle={styles.rightValue}
                  {...bottomRowBalanceTextStyle}
                />
              )}
            </Box>
            {isStockToken(token as BridgeToken) && <StockBadge token={token} />}
          </Box>
        </Box>
      </TouchableOpacity>

      <View style={styles.childrenWrapper}>{children}</View>
    </Box>
  );
};
