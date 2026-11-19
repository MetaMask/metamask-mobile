import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { AnimationDuration } from '@metamask/design-tokens';
import React, { useMemo, type ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  type SharedValue,
} from 'react-native-reanimated';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import CapsuleGlass from '../../../../component-library/components-temp/CapsuleGlass';
import HeaderSubpageGlass from '../../../../component-library/components-temp/HeaderSubpageGlass';
import { toFormattedAddress } from '../../../../util/address';
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
import type { TdpVersion } from '../analytics/getTdpAnalyticsBase';
import { TokenDetailsIds } from '../testIds';

const COMPACT_ADDRESS_EDGE_LENGTH = 4;

const TITLE_PROPS = {
  numberOfLines: 1,
  ellipsizeMode: 'tail',
  twClassName: 'shrink min-w-0',
  testID: 'token-details-title',
} as const;

const formatCompactContractAddress = (address: string): string => {
  const formatted = toFormattedAddress(address);
  const tail = formatted.slice(-COMPACT_ADDRESS_EDGE_LENGTH);
  if (formatted.toLowerCase().startsWith('0x')) {
    return `0x..${tail}`;
  }
  if (formatted.length <= COMPACT_ADDRESS_EDGE_LENGTH * 2) {
    return formatted;
  }
  return `${formatted.slice(0, COMPACT_ADDRESS_EDGE_LENGTH)}..${tail}`;
};

const useTokenDetailsIdentity = ({
  token,
  securityData,
  onCopyAddress,
  titleEndAccessory,
  description,
  tdpVersion,
  hideContractAddress = false,
  inContent = false,
}: TokenDetailsIdentityProps) => {
  const tw = useTailwind();
  const { isStockToken } = useRWAToken();
  const { securityConfig, handleSecurityBadgePress } =
    useTokenSecurityBadgePress(token, securityData, tdpVersion);

  const isNativeToken = token.isETH || token.isNative;
  const contractAddress = useMemo(() => {
    if (hideContractAddress || isNativeToken) {
      return null;
    }
    return resolveTokenContractAddress(token);
  }, [token, isNativeToken, hideContractAddress]);
  const handleCopyContractAddress = useCopyTokenContractAddress(
    contractAddress,
    onCopyAddress,
  );

  const networkBadgeSource = token.chainId
    ? NetworkBadgeSource(token.chainId as Hex)
    : undefined;

  const defaultTitleEndAccessory = useMemo(() => {
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

  const tokenName = token.name?.trim() || token.ticker || token.symbol;
  const tokenTicker = token.ticker || token.symbol;
  const showTickerBelowName = Boolean(
    tokenTicker && tokenName && tokenTicker !== tokenName,
  );

  const trailingDetail = useMemo(() => {
    if (description) {
      return (
        <Animated.View
          key="live-price"
          entering={FadeIn.duration(AnimationDuration.Fast)}
          exiting={FadeOut.duration(AnimationDuration.Fast)}
        >
          {description}
        </Animated.View>
      );
    }

    if (contractAddress) {
      return (
        <Animated.View
          key="contract-address"
          entering={FadeIn.duration(AnimationDuration.Fast)}
          exiting={FadeOut.duration(AnimationDuration.Fast)}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="shrink-0 gap-1"
            testID={TokenDetailsIds.header.address}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {formatCompactContractAddress(contractAddress)}
            </Text>
            <ButtonIcon
              iconName={IconName.Copy}
              size={ButtonIconSize.Xs}
              onPress={handleCopyContractAddress}
              iconProps={{
                color: IconColor.IconAlternative,
                size: IconSize.Sm,
              }}
              testID={TokenDetailsIds.header.copyAddressButton}
              accessibilityLabel={strings('token.contract_address')}
            />
          </Box>
        </Animated.View>
      );
    }

    return null;
  }, [description, contractAddress, handleCopyContractAddress]);

  const hasSubtitle = showTickerBelowName || trailingDetail;

  const headerDescription = useMemo(
    () => (hasSubtitle ? <Box /> : undefined),
    [hasSubtitle],
  );

  const subtitleAccessory = useMemo(() => {
    if (!hasSubtitle) {
      return undefined;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full min-w-0 gap-1"
        style={inContent ? undefined : tw.style('min-w-0 flex-1 -ml-1')}
        testID={TokenDetailsIds.header.subtitle}
      >
        {showTickerBelowName ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            ellipsizeMode="tail"
            twClassName="shrink min-w-0"
            testID={TokenDetailsIds.header.ticker}
          >
            {tokenTicker}
          </Text>
        ) : null}
        {trailingDetail}
      </Box>
    );
  }, [
    hasSubtitle,
    showTickerBelowName,
    tokenTicker,
    trailingDetail,
    tw,
    inContent,
  ]);

  const avatar = (
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
  );

  return {
    avatar,
    tokenName,
    headerDescription,
    subtitleAccessory,
    resolvedTitleEndAccessory: titleEndAccessory ?? defaultTitleEndAccessory,
  };
};

interface TokenDetailsIdentityProps {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  onCopyAddress?: () => void;
  titleEndAccessory?: ReactNode;
  /** Replaces the contract-address row, for example with the scrolled live price. */
  description?: ReactNode;
  tdpVersion?: TdpVersion;
  hideContractAddress?: boolean;
  /** Drops the header subtitle's negative margin when the block sits in content. */
  inContent?: boolean;
}

export const TokenDetailsIdentity = ({
  token,
  securityData,
  onCopyAddress,
  titleEndAccessory,
  description,
  tdpVersion,
  hideContractAddress = false,
  inContent = false,
}: TokenDetailsIdentityProps) => {
  const identity = useTokenDetailsIdentity({
    token,
    securityData,
    onCopyAddress,
    titleEndAccessory,
    description,
    tdpVersion,
    hideContractAddress,
    inContent,
  });

  if (!identity.tokenName) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3 px-4 pt-2"
      testID="token-details-identity"
    >
      {identity.avatar}
      <Box twClassName="min-w-0 flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="min-w-0"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            ellipsizeMode="tail"
            twClassName="shrink min-w-0"
            testID="token-details-title"
          >
            {identity.tokenName}
          </Text>
          {identity.resolvedTitleEndAccessory}
        </Box>
        {identity.subtitleAccessory}
      </Box>
    </Box>
  );
};

export const TokenDetailsInlineHeader = ({
  token,
  securityData,
  onBackPress,
  onPriceAlertPress,
  onSharePress,
  starButton,
  onCopyAddress,
  titleEndAccessory,
  description,
  tdpVersion,
  hideContractAddress = false,
  isGlass = false,
  onLayout,
  scrollY,
  showIdentityInHeader = true,
}: {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  onBackPress: () => void;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
  /** Self-contained watchlist star button ReactNode (e.g. WatchlistStarButton). */
  starButton?: ReactNode;
  onCopyAddress?: () => void;
  titleEndAccessory?: ReactNode;
  description?: ReactNode;
  tdpVersion?: TdpVersion;
  hideContractAddress?: boolean;
  /**
   * Floats the header over the page on its glass backdrop, with the buttons in
   * capsules, as on the brand refresh.
   */
  isGlass?: boolean;
  /** Reports the floating header's height; pair with `useHeaderGlassInset`. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** The page's scroll offset, which fades the glass backdrop in. */
  scrollY?: SharedValue<number>;
  /**
   * When `false`, the name, ticker, and address render in the page content
   * above the price instead of inside this header.
   */
  showIdentityInHeader?: boolean;
}) => {
  const identity = useTokenDetailsIdentity({
    token,
    securityData,
    onCopyAddress,
    titleEndAccessory,
    description,
    tdpVersion,
    hideContractAddress,
  });

  // Left → right: watchlist star, price alert, share.
  const endAccessory = useMemo(() => {
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
    // On glass the actions share one capsule, as on the home header.
    if (isGlass) {
      return <CapsuleGlass twClassName="gap-1 px-1.5">{buttons}</CapsuleGlass>;
    }
    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
        {buttons}
      </Box>
    );
  }, [starButton, onPriceAlertPress, onSharePress, isGlass]);

  return (
    <HeaderSubpageGlass
      isGlass={isGlass}
      onLayout={onLayout}
      scrollY={scrollY}
      includesTopInset
      // The glass backdrop replaces the solid background.
      twClassName={
        isGlass
          ? 'min-h-14 h-auto justify-center'
          : 'min-h-14 h-auto bg-default justify-center'
      }
      onBack={onBackPress}
      backButtonProps={{ testID: 'back-arrow-button' }}
      endAccessory={endAccessory}
      avatar={showIdentityInHeader ? identity.avatar : undefined}
      title={showIdentityInHeader ? identity.tokenName : undefined}
      // Long names (e.g. Robinhood stock tokens) would otherwise keep their full
      // width and push the title badges under the watchlist star.
      titleProps={showIdentityInHeader ? TITLE_PROPS : undefined}
      titleEndAccessory={
        showIdentityInHeader ? identity.resolvedTitleEndAccessory : undefined
      }
      description={
        showIdentityInHeader ? identity.headerDescription : undefined
      }
      descriptionEndAccessory={
        showIdentityInHeader ? identity.subtitleAccessory : undefined
      }
    />
  );
};
