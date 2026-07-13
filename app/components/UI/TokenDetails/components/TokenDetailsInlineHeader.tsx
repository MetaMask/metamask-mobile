import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  HeaderSubpage,
  IconName,
  IconColor,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
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

export const TokenDetailsInlineHeader = ({
  token,
  securityData,
  onBackPress,
  onPriceAlertPress,
  onSharePress,
  onStarPress,
  isWatched,
  onCopyAddress,
  iconColor,
  useAmbientColor = false,
}: {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  onBackPress: () => void;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
  onStarPress?: () => void;
  isWatched?: boolean;
  onCopyAddress?: () => void;
  /** Hex color string for the back button icon (A/B test). */
  iconColor?: string;
  useAmbientColor?: boolean;
}) => {
  const tw = useTailwind();
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

  const shouldShowEndButtons = !useAmbientColor || iconColor !== undefined;

  const backButtonIconProps = useMemo(() => {
    if (useAmbientColor && iconColor) {
      return { twClassName: `text-[${iconColor}]` };
    }
    return undefined;
  }, [useAmbientColor, iconColor]);

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

  const endButtonIconProps = useMemo(() => {
    const buttons = [];
    if (onStarPress) {
      buttons.push({
        iconName: isWatched ? IconName.StarFilled : IconName.Star,
        onPress: onStarPress,
        testID: 'watchlist-star-button',
        accessibilityLabel: isWatched
          ? 'Remove from watchlist'
          : 'Add to watchlist',
      });
    }
    if (shouldShowEndButtons && onSharePress) {
      buttons.push({
        iconName: IconName.Share,
        onPress: onSharePress,
        testID: 'share-button',
        accessibilityLabel: 'Share token',
      });
    }
    if (shouldShowEndButtons && onPriceAlertPress) {
      buttons.push({
        iconName: IconName.Notification,
        onPress: onPriceAlertPress,
        testID: TokenOverviewSelectorsIDs.PRICE_ALERT_BUTTON,
        accessibilityLabel: 'Create price alert',
      });
    }
    return buttons.length > 0 ? buttons : undefined;
  }, [
    shouldShowEndButtons,
    onStarPress,
    isWatched,
    onSharePress,
    onPriceAlertPress,
  ]);

  const descriptionEndAccessory = useMemo(() => {
    if (!contractAddress) {
      return undefined;
    }

    return (
      <ButtonIcon
        iconName={IconName.Copy}
        size={ButtonIconSize.Xs}
        onPress={handleCopyContractAddress}
        iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
        testID="copy-contract-address-button"
        accessibilityLabel={strings('token.contract_address')}
      />
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
          iconProps={backButtonIconProps}
          testID="back-arrow-button"
        />
      }
      endButtonIconProps={endButtonIconProps}
      avatar={
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          style={tw.style('self-center')}
          badgeElement={
            networkBadgeSource ? (
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkBadgeSource}
                size={AvatarSize.Xs}
              />
            ) : undefined
          }
        >
          <AssetLogo asset={token} />
        </BadgeWrapper>
      }
      title={token.ticker || token.symbol}
      titleEndAccessory={titleEndAccessory}
      description={
        contractAddress ? formatAddress(contractAddress, 'short') : undefined
      }
      descriptionEndAccessory={descriptionEndAccessory}
    />
  );
};
