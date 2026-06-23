import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import React, { useMemo } from 'react';
import {
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
  onCopyAddress,
  iconColor,
  useAmbientColor = false,
}: {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | undefined;
  onBackPress: () => void;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
  onCopyAddress?: () => void;
  /** Hex color string for the back button icon (A/B test). */
  iconColor?: string;
  useAmbientColor?: boolean;
}) => {
  const tw = useTailwind();
  const { isStockToken } = useRWAToken();
  const { securityConfig, handleSecurityBadgePress } =
    useTokenSecurityBadgePress(token, securityData);

  const contractAddress = useMemo(
    () => resolveTokenContractAddress(token),
    [token],
  );
  const handleCopyContractAddress = useCopyTokenContractAddress(
    contractAddress,
    onCopyAddress,
  );

  const shouldShowButton = !useAmbientColor || iconColor !== undefined;

  const networkBadgeSource = token.chainId
    ? NetworkBadgeSource(token.chainId as Hex)
    : undefined;

  const titleEndAccessory = useMemo(() => {
    if (securityData?.resultType === 'Verified' && securityConfig.badge) {
      return (
        <ButtonIcon
          iconName={securityConfig.badge.icon}
          size={ButtonIconSize.Sm}
          onPress={handleSecurityBadgePress}
          iconProps={{ color: securityConfig.badge.iconColor }}
          testID="security-badge-verified"
          accessibilityLabel={securityConfig.label}
        />
      );
    }
    if (!token.name && isStockToken(token as BridgeToken)) {
      return <StockBadge token={token as BridgeToken} />;
    }
    return undefined;
  }, [
    securityData?.resultType,
    securityConfig.badge,
    securityConfig.label,
    handleSecurityBadgePress,
    token,
    isStockToken,
  ]);

  const endButtonIconProps = useMemo(() => {
    if (!shouldShowButton) {
      return undefined;
    }
    const buttons = [];
    if (onSharePress) {
      buttons.push({
        iconName: IconName.Share,
        onPress: onSharePress,
        testID: 'share-button',
        accessibilityLabel: 'Share token',
      });
    }
    if (onPriceAlertPress) {
      buttons.push({
        iconName: IconName.Notification,
        onPress: onPriceAlertPress,
        testID: TokenOverviewSelectorsIDs.PRICE_ALERT_BUTTON,
        accessibilityLabel: 'Create price alert',
      });
    }
    return buttons.length > 0 ? buttons : undefined;
  }, [shouldShowButton, onSharePress, onPriceAlertPress]);

  const descriptionEndAccessory = useMemo(() => {
    if (!contractAddress) {
      return undefined;
    }

    return (
      <ButtonIcon
        iconName={IconName.Copy}
        size={ButtonIconSize.Sm}
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
        shouldShowButton ? (
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={onBackPress}
            iconProps={
              iconColor ? { twClassName: `text-[${iconColor}]` } : undefined
            }
            testID="back-arrow-button"
          />
        ) : undefined
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
