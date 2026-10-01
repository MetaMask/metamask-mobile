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
  BoxFlexDirection,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  HeaderSubpage,
  IconName,
  IconColor,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { formatAddress } from '../../../../util/address';
import AssetLogo from '../../Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
import { resolveTokenContractAddress } from '../../AssetOverview/utils/getTokenDetails';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';
import StockBadge from '../../shared/StockBadge/StockBadge';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useCopyTokenContractAddress } from '../hooks/useCopyTokenContractAddress';
import { useTokenSecurityBadgePress } from '../hooks/useTokenSecurityBadgePress';
import { TOKEN_DETAILS_HEADER_V2_ENABLED } from './tokenDetailsHeaderConfig';

export const TOKEN_DETAILS_HEADER_V2_TEST_IDS = {
  CONTAINER: 'token-details-header-v2',
  IDENTITY: 'token-details-header-v2-identity',
  TICKER: 'token-details-header-v2-ticker',
  AGE_PILL: 'token-details-header-v2-age',
  SUBTITLE: 'token-details-header-v2-subtitle',
} as const;

const FADE_START_PX = 80;
const FADE_END_PX = 140;
const FADE_TRAVEL_PX = 6;

export interface TokenDetailsInlineHeaderProps {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  onBackPress: () => void;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
  /** Self-contained watchlist star button ReactNode (e.g. WatchlistStarButton). */
  starButton?: ReactNode;
  onCopyAddress?: () => void;
  /**
   * V2 only — Reanimated scroll offset shared value (written to by
   * `useTokenHeaderScroll`). When provided alongside
   * `TOKEN_DETAILS_HEADER_V2_ENABLED`, drives the compact-identity fade.
   */
  scrollY?: SharedValue<number>;
  /**
   * V2 only — formatted token age (e.g. "3d", "6mo"). Hidden when
   * undefined (defensive fallback when upstream age data is missing).
   */
  tokenAge?: string;
}

const useHeaderIdentityPieces = (
  token: TokenDetailsRouteParams,
  securityData: TokenSecurityData | null | undefined,
  onCopyAddress: (() => void) | undefined,
) => {
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

  return {
    contractAddress,
    handleCopyContractAddress,
    networkBadgeSource,
    titleEndAccessory,
  };
};

const useHeaderEndAccessory = ({
  starButton,
  onPriceAlertPress,
  onSharePress,
}: {
  starButton?: ReactNode;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
}): ReactNode | undefined =>
  useMemo(() => {
    const buttons: ReactNode[] = [];

    if (starButton) {
      buttons.push(<React.Fragment key="star">{starButton}</React.Fragment>);
    }
    if (onPriceAlertPress) {
      buttons.push(
        <ButtonIcon
          key="alert"
          iconName={IconName.Notification}
          size={ButtonIconSize.Md}
          onPress={onPriceAlertPress}
          testID={TokenOverviewSelectorsIDs.PRICE_ALERT_BUTTON}
          accessibilityLabel="Create price alert"
        />,
      );
    }
    if (onSharePress) {
      buttons.push(
        <ButtonIcon
          key="share"
          iconName={IconName.Share}
          size={ButtonIconSize.Md}
          onPress={onSharePress}
          testID="share-button"
          accessibilityLabel="Share token"
        />,
      );
    }

    if (buttons.length === 0) return undefined;
    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
        {buttons}
      </Box>
    );
  }, [starButton, onPriceAlertPress, onSharePress]);

const TokenDetailsInlineHeaderLegacy: React.FC<
  TokenDetailsInlineHeaderProps
> = ({
  token,
  securityData,
  onBackPress,
  onPriceAlertPress,
  onSharePress,
  starButton,
  onCopyAddress,
}) => {
  const {
    contractAddress,
    handleCopyContractAddress,
    networkBadgeSource,
    titleEndAccessory,
  } = useHeaderIdentityPieces(token, securityData, onCopyAddress);

  const endAccessory = useHeaderEndAccessory({
    starButton,
    onPriceAlertPress,
    onSharePress,
  });

  const inlineDescription = useMemo(() => {
    if (!contractAddress) {
      return undefined;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {formatAddress(contractAddress, 'short')}
        </Text>
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSize.Xs}
          onPress={handleCopyContractAddress}
          iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
          testID="copy-contract-address-button"
          accessibilityLabel={strings('token.contract_address')}
        />
      </Box>
    );
  }, [contractAddress, handleCopyContractAddress]);

  return (
    <HeaderSubpage
      includesTopInset
      twClassName="min-h-14 h-auto bg-default justify-center"
      startAccessory={
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBackPress}
          testID="back-arrow-button"
        />
      }
      endAccessory={endAccessory}
      avatar={
        <BadgeWrapper
          twClassName="self-center"
          position={BadgeWrapperPosition.BottomRight}
          badge={
            networkBadgeSource ? (
              <BadgeNetwork src={networkBadgeSource} twClassName="h-5 w-5" />
            ) : undefined
          }
        >
          <AssetLogo asset={token} />
        </BadgeWrapper>
      }
      title={token.ticker || token.symbol}
      titleEndAccessory={titleEndAccessory}
      description={inlineDescription}
    />
  );
};

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

const TokenDetailsInlineHeaderV2: React.FC<TokenDetailsInlineHeaderProps> = ({
  token,
  securityData,
  onBackPress,
  onPriceAlertPress,
  onSharePress,
  starButton,
  onCopyAddress,
  scrollY,
  tokenAge,
}) => {
  const insets = useSafeAreaInsets();
  const {
    contractAddress,
    handleCopyContractAddress,
    networkBadgeSource,
    titleEndAccessory,
  } = useHeaderIdentityPieces(token, securityData, onCopyAddress);

  const endAccessory = useHeaderEndAccessory({
    starButton,
    onPriceAlertPress,
    onSharePress,
  });

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
        testID={TOKEN_DETAILS_HEADER_V2_TEST_IDS.SUBTITLE}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {formatAddress(contractAddress, 'short')}
        </Text>
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSize.Xs}
          onPress={handleCopyContractAddress}
          iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
          testID="copy-contract-address-button"
          accessibilityLabel={strings('token.contract_address')}
        />
      </Box>
    );
  }, [contractAddress, handleCopyContractAddress]);

  return (
    <Box
      testID={TOKEN_DETAILS_HEADER_V2_TEST_IDS.CONTAINER}
      twClassName="bg-default"
      style={{ paddingTop: insets.top }}
    >
      <View style={styles.row}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBackPress}
          testID="back-arrow-button"
        />
        <Animated.View
          testID={TOKEN_DETAILS_HEADER_V2_TEST_IDS.IDENTITY}
          style={[styles.identityRow, identityAnimatedStyle]}
          pointerEvents="box-none"
        >
          <View style={styles.avatarWrapper}>
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
                testID={TOKEN_DETAILS_HEADER_V2_TEST_IDS.TICKER}
              >
                {token.ticker || token.symbol}
              </Text>
              {tokenAge ? (
                <Box
                  twClassName="rounded-md bg-muted px-1.5 py-0.5 shrink-0"
                  testID={TOKEN_DETAILS_HEADER_V2_TEST_IDS.AGE_PILL}
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
        {endAccessory ?? null}
      </View>
    </Box>
  );
};

export const TokenDetailsInlineHeader: React.FC<
  TokenDetailsInlineHeaderProps
> = (props) => {
  if (TOKEN_DETAILS_HEADER_V2_ENABLED) {
    return <TokenDetailsInlineHeaderV2 {...props} />;
  }
  return <TokenDetailsInlineHeaderLegacy {...props} />;
};
