import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import React, { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { formatAddress } from '../../../../util/address';
import AssetLogo from '../../Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
import { resolveTokenContractAddress } from '../../AssetOverview/utils/getTokenDetails';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import type { BridgeToken } from '../../Bridge/types';
import StockBadge from '../../shared/StockBadge/StockBadge';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useCopyTokenContractAddress } from '../hooks/useCopyTokenContractAddress';
import { useTokenSecurityBadgePress } from '../hooks/useTokenSecurityBadgePress';

export const TOKEN_DETAILS_V1_HEADER_TEST_IDS = {
  CONTAINER: 'token-details-v1-header',
  BACK_BUTTON: 'button-v1-back',
  IDENTITY: 'v1-header-identity',
  AVATAR: 'v1-header-avatar',
  TICKER: 'text-v1-ticker',
  AGE_PILL: 'text-v1-age',
  SUBTITLE: 'text-v1-subtitle',
  ADDRESS: 'text-v1-address',
  COPY_BUTTON: 'button-v1-copy-address',
  ACTIONS_GROUP: 'v1-header-actions',
  WATCHLIST_BUTTON: 'button-v1-watchlist',
  PRICE_ALERT_BUTTON: 'button-v1-price-alert',
  SHARE_BUTTON: 'button-v1-share',
} as const;

export interface TokenDetailsV1HeaderProps {
  token: TokenDetailsRouteParams;
  securityData?: TokenSecurityData | null;
  tokenAge?: string | null;
  scrollY?: SharedValue<number>;
  onBackPress: () => void;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
  starButton?: ReactNode;
  onCopyAddress?: () => void;
  testID?: string;
}

const FADE_START_PX = 80;
const FADE_END_PX = 140;
const FADE_TRAVEL_PX = 6;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  identityRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarWrapper: {
    width: 32,
    height: 32,
  },
});

export const TokenDetailsV1Header: React.FC<TokenDetailsV1HeaderProps> = ({
  token,
  securityData,
  tokenAge,
  scrollY,
  onBackPress,
  onPriceAlertPress,
  onSharePress,
  starButton,
  onCopyAddress,
  testID = TOKEN_DETAILS_V1_HEADER_TEST_IDS.CONTAINER,
}) => {
  const insets = useSafeAreaInsets();
  const { isStockToken } = useRWAToken();
  const { securityConfig, handleSecurityBadgePress } =
    useTokenSecurityBadgePress(token, securityData);

  const isNativeToken = token.isETH || token.isNative;
  const contractAddress = useMemo(() => {
    if (isNativeToken) {
      return null;
    }
    return resolveTokenContractAddress(token);
  }, [token, isNativeToken]);

  const handleCopyContractAddress = useCopyTokenContractAddress(
    contractAddress,
    onCopyAddress,
  );

  const networkBadgeSource = token.chainId
    ? NetworkBadgeSource(token.chainId as Hex)
    : undefined;

  const titleEndAccessory = useMemo(() => {
    const verifiedBadgeConfig =
      securityData?.resultType === 'Verified'
        ? securityConfig.badge
        : undefined;
    const showStock = isStockToken(token as BridgeToken);

    const verifiedBadge = verifiedBadgeConfig ? (
      <ButtonIcon
        iconName={verifiedBadgeConfig.icon}
        size={ButtonIconSize.Sm}
        onPress={handleSecurityBadgePress}
        iconProps={{ color: verifiedBadgeConfig.iconColor }}
        testID="security-badge-verified"
        accessibilityLabel={securityConfig.label}
      />
    ) : null;

    const stockBadge = showStock ? (
      <StockBadge token={token as BridgeToken} />
    ) : null;

    if (!verifiedBadge && !stockBadge) {
      return undefined;
    }

    if (verifiedBadge && stockBadge) {
      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="items-center gap-1"
        >
          {verifiedBadge}
          {stockBadge}
        </Box>
      );
    }

    return verifiedBadge ?? stockBadge;
  }, [
    securityData?.resultType,
    securityConfig.badge,
    securityConfig.label,
    handleSecurityBadgePress,
    token,
    isStockToken,
  ]);

  const identityAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    const y = scrollY.get();
    const opacity = interpolate(
      y,
      [FADE_START_PX, FADE_END_PX],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      y,
      [FADE_START_PX, FADE_END_PX],
      [FADE_TRAVEL_PX, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const subtitle = useMemo(() => {
    if (!contractAddress) {
      return null;
    }
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1 min-w-0"
        testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.SUBTITLE}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.ADDRESS}
        >
          {formatAddress(contractAddress, 'short')}
        </Text>
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSize.Xs}
          onPress={handleCopyContractAddress}
          iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
          testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.COPY_BUTTON}
          accessibilityLabel={strings('token.contract_address')}
        />
      </Box>
    );
  }, [contractAddress, handleCopyContractAddress]);

  return (
    <Box
      testID={testID}
      twClassName="bg-default z-20"
      style={{ paddingTop: insets.top }}
    >
      <View style={styles.row}>
        {/* Back button (circular container matching prototype 4016-header-top.png) */}
        <Box twClassName="w-10 h-10 rounded-full border border-muted bg-default items-center justify-center overflow-hidden shrink-0">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Lg}
            variant={ButtonIconVariant.Default}
            onPress={onBackPress}
            testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.BACK_BUTTON}
            accessibilityLabel="Back to token list"
          />
        </Box>

        {/* Scroll-aware identity (avatar + badge, ticker + age pill, address + copy) */}
        <Animated.View
          testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.IDENTITY}
          style={[styles.identityRow, identityAnimatedStyle]}
          pointerEvents="box-none"
        >
          <View
            style={styles.avatarWrapper}
            testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.AVATAR}
          >
            <BadgeWrapper
              position={BadgeWrapperPosition.BottomRight}
              badge={
                networkBadgeSource ? (
                  <BadgeNetwork
                    src={networkBadgeSource}
                    twClassName="h-4 w-4"
                  />
                ) : undefined
              }
            >
              <AssetLogo asset={token} size={AvatarTokenSize.Md} />
            </BadgeWrapper>
          </View>
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="flex-1 min-w-0"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1.5 min-w-0"
            >
              <Text
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
                numberOfLines={1}
                testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.TICKER}
              >
                {token.ticker || token.symbol}
              </Text>
              {tokenAge ? (
                <Box
                  twClassName="rounded-md bg-muted px-1.5 py-0.5 shrink-0"
                  testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.AGE_PILL}
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {tokenAge}
                  </Text>
                </Box>
              ) : null}
              {titleEndAccessory ?? null}
            </Box>
            {subtitle}
          </Box>
        </Animated.View>

        {/* Action controls pill (star + bell + share matching prototype 4016-header-top.png) */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="rounded-full border border-muted bg-default overflow-hidden h-10 shrink-0"
          testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.ACTIONS_GROUP}
        >
          <Box
            twClassName="w-10 h-10 items-center justify-center"
            testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.WATCHLIST_BUTTON}
          >
            {starButton ?? (
              <ButtonIcon
                iconName={IconName.Star}
                size={ButtonIconSize.Lg}
                variant={ButtonIconVariant.Default}
                testID="button-v1-watchlist-fallback"
                accessibilityLabel="Add to watchlist"
              />
            )}
          </Box>
          <ButtonIcon
            iconName={IconName.Notification}
            size={ButtonIconSize.Lg}
            variant={ButtonIconVariant.Default}
            onPress={onPriceAlertPress}
            isDisabled={!onPriceAlertPress}
            testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.PRICE_ALERT_BUTTON}
            accessibilityLabel="Price alerts"
          />
          <ButtonIcon
            iconName={IconName.Share}
            size={ButtonIconSize.Lg}
            variant={ButtonIconVariant.Default}
            onPress={onSharePress}
            isDisabled={!onSharePress}
            testID={TOKEN_DETAILS_V1_HEADER_TEST_IDS.SHARE_BUTTON}
            accessibilityLabel="Share token"
          />
        </Box>
      </View>
    </Box>
  );
};

export default TokenDetailsV1Header;
