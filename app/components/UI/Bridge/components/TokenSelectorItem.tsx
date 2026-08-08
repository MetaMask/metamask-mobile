import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  View,
  TouchableOpacity,
  StyleProp,
  TextStyle,
} from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { getAssetTestId } from '../../../../../tests/selectors/Wallet/WalletView.selectors';
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
import { BridgeToken, SecurityDataType } from '../types';
import { fontStyles } from '../../../../styles/common';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../Tokens/constants';
import Tag from '../../../../component-library/components/Tags/Tag';
import { ACCOUNT_TYPE_LABELS } from '../../../../constants/account-type-labels';
import { formatTokenBalance, getTokenImageSource } from '../utils';
import {
  TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
  TokenSelectorBalanceLayoutConfig,
  TokenSelectorBalanceLayoutVariant,
} from './TokenSelectorItem.abTestConfig';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { getBridgeTokenSecurityConfig } from '../utils/tokenSecurityUtils';

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
    tokenNameRow: {
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
    pressTargetContent: {
      flex: 1,
      minWidth: 0,
    },
    itemWrapperWithChildren: {
      alignItems: 'center',
    },
  });

interface BalanceTextProps {
  textStyle?: StyleProp<TextStyle>;
  textVariant: TextVariant;
  textColor: TextColor;
}

interface TokenSelectorItemProps {
  token: BridgeToken;
  onPress: (token: BridgeToken) => void;
  networkName?: string;
  networkImageSource?: ImageSourcePropType;
  isSelected?: boolean;
  shouldShowBalance?: boolean;
  children?: React.ReactNode;
  isNoFeeAsset?: boolean;
  showStockBadge?: boolean;
  secondaryRowContent?: React.ReactNode;
  tokenBalanceTextProps?: Partial<BalanceTextProps>;
  balanceLayoutConfigOverride?: TokenSelectorBalanceLayoutConfig;
  shouldChangeSelectedStyle?: boolean;
  shouldShowNetworkIcon?: boolean;
  shouldIncludeChildrenInPressTarget?: boolean;
  pressTargetAccessibilityLabel?: string;
}

const isLoadingBalance = (balance?: string) =>
  balance === TOKEN_BALANCE_LOADING ||
  balance === TOKEN_BALANCE_LOADING_UPPERCASE;

export const getSecurityTag = (securityType: SecurityDataType | undefined) => {
  if (
    securityType === SecurityDataType.Warning ||
    securityType === SecurityDataType.Spam ||
    securityType === SecurityDataType.Malicious
  ) {
    return getBridgeTokenSecurityConfig(securityType);
  }
  return null;
};

const FiatBalanceView = ({
  balance,
  isSelected,
  textStyle,
  textVariant,
  textColor,
}: BalanceTextProps & {
  balance?: string;
  isSelected: boolean;
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
}: BalanceTextProps & {
  balance?: string;
  isSelected: boolean;
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

const TOP_ROW_BALANCE_TEXT_STYLE = {
  textVariant: TextVariant.BodyMDMedium,
  textColor: TextColor.Default,
} as const;

const BOTTOM_ROW_BALANCE_TEXT_STYLE = {
  textVariant: TextVariant.BodySM,
  textColor: TextColor.Alternative,
} as const;

const TokenSelectorItemInner: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
  isSelected = false,
  shouldShowBalance = true,
  children,
  isNoFeeAsset = false,
  showStockBadge = false,
  secondaryRowContent,
  tokenBalanceTextProps,
  balanceLayoutConfigOverride,
  shouldChangeSelectedStyle = true,
  shouldShowNetworkIcon = true,
  shouldIncludeChildrenInPressTarget = false,
  pressTargetAccessibilityLabel,
}) => {
  const shouldShowSelectedStyle = isSelected && shouldChangeSelectedStyle;
  const { styles } = useStyles(createStyles, {
    isSelected: shouldShowSelectedStyle,
  });
  const showNoFeeBadge = isNoFeeAsset;

  const fiatValue = token.balanceFiat;

  const selectedVariant =
    balanceLayoutConfigOverride ??
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

  const handlePress = useCallback(() => {
    onPress(token);
  }, [onPress, token]);

  const tokenImageSource = useMemo(
    () =>
      getTokenImageSource(
        token.symbol,
        token.image,
        token.address,
        token.chainId,
      ),
    [token.address, token.chainId, token.image, token.symbol],
  );

  const fiatBalance = shouldShowBalance ? fiatValue : undefined;
  const tokenBalance = shouldShowBalance ? cryptoBalance : undefined;

  const label = token.accountType
    ? ACCOUNT_TYPE_LABELS[token.accountType]
    : undefined;

  const securityTag = getSecurityTag(token.securityData?.type);
  const tokenAvatar = (
    <AvatarToken
      name={token.symbol}
      imageSource={tokenImageSource}
      size={AvatarSize.Lg}
      testID={
        isNative ? `network-logo-${token.symbol}` : `token-logo-${token.symbol}`
      }
    />
  );

  return (
    <Box
      accessible={false}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      {shouldShowSelectedStyle && <View style={styles.selectedIndicator} />}

      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.itemWrapper,
          shouldIncludeChildrenInPressTarget && styles.itemWrapperWithChildren,
        ]}
        accessibilityRole={
          shouldIncludeChildrenInPressTarget ? 'checkbox' : undefined
        }
        accessibilityState={
          shouldIncludeChildrenInPressTarget
            ? { checked: isSelected }
            : undefined
        }
        accessibilityLabel={
          shouldIncludeChildrenInPressTarget
            ? pressTargetAccessibilityLabel
            : undefined
        }
        testID={getAssetTestId(`${token.chainId}-${token.symbol}`)}
      >
        <Box
          accessible={false}
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={4}
          style={
            shouldIncludeChildrenInPressTarget
              ? styles.pressTargetContent
              : undefined
          }
        >
          {/* Token Icon */}
          {shouldShowNetworkIcon ? (
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
              {tokenAvatar}
            </BadgeWrapper>
          ) : (
            tokenAvatar
          )}

          <Box
            accessible={false}
            style={styles.tokenInfo}
            flexDirection={FlexDirection.Column}
            gap={4}
          >
            <Box
              accessible={false}
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.spaceBetween}
            >
              <Box accessible={false} style={styles.tokenMainInfo} gap={4}>
                <Box accessible={false} style={styles.tokenSymbolRow}>
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
                  isSelected={shouldShowSelectedStyle}
                  textStyle={[
                    styles.rightValue,
                    tokenBalanceTextProps?.textStyle,
                  ]}
                  textVariant={
                    tokenBalanceTextProps?.textVariant ??
                    TOP_ROW_BALANCE_TEXT_STYLE.textVariant
                  }
                  textColor={
                    tokenBalanceTextProps?.textColor ??
                    TOP_ROW_BALANCE_TEXT_STYLE.textColor
                  }
                />
              ) : (
                <FiatBalanceView
                  balance={fiatBalance}
                  isSelected={shouldShowSelectedStyle}
                  textStyle={styles.rightValue}
                  textVariant={TOP_ROW_BALANCE_TEXT_STYLE.textVariant}
                  textColor={TOP_ROW_BALANCE_TEXT_STYLE.textColor}
                />
              )}
            </Box>

            <Box
              accessible={false}
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.spaceBetween}
            >
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                style={styles.tokenNameRow}
                gap={4}
              >
                {secondaryRowContent ?? (
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.tokenName}
                  >
                    {token.name}
                  </Text>
                )}
              </Box>

              {selectedVariant.showTokenBalanceFirst ? (
                <FiatBalanceView
                  balance={fiatBalance}
                  isSelected={shouldShowSelectedStyle}
                  textStyle={styles.rightValue}
                  textVariant={BOTTOM_ROW_BALANCE_TEXT_STYLE.textVariant}
                  textColor={BOTTOM_ROW_BALANCE_TEXT_STYLE.textColor}
                />
              ) : (
                <TokenBalanceView
                  balance={tokenBalance}
                  isSelected={shouldShowSelectedStyle}
                  textStyle={[
                    styles.rightValue,
                    tokenBalanceTextProps?.textStyle,
                  ]}
                  textVariant={
                    tokenBalanceTextProps?.textVariant ??
                    BOTTOM_ROW_BALANCE_TEXT_STYLE.textVariant
                  }
                  textColor={
                    tokenBalanceTextProps?.textColor ??
                    BOTTOM_ROW_BALANCE_TEXT_STYLE.textColor
                  }
                />
              )}
            </Box>
            {showStockBadge && <StockBadge token={token} />}
          </Box>
        </Box>
        {shouldIncludeChildrenInPressTarget && children ? (
          <View style={styles.childrenWrapper} pointerEvents="none">
            {children}
          </View>
        ) : null}
      </TouchableOpacity>

      {!shouldIncludeChildrenInPressTarget && children ? (
        <View style={styles.childrenWrapper}>{children}</View>
      ) : null}
    </Box>
  );
};

export const TokenSelectorItem = React.memo(TokenSelectorItemInner);
