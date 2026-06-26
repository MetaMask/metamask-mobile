import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  IconColor,
  AvatarToken,
  AvatarTokenSize,
  AvatarNetwork,
  AvatarNetworkSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { buildTokenIconUrl } from '../../../util/buildTokenIconUrl';
import { LINEA_CAIP_CHAIN_ID } from '../../../util/buildTokenList';
import { safeFormatChainIdToHex } from '../../../util/safeFormatChainIdToHex';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { cardNetworkInfos } from '../../../constants';
import { CaipChainId } from '@metamask/utils';

export interface AssetCardProps {
  /** Token symbol (e.g., 'mUSD', 'USDC') or 'Other' */
  symbol: string;
  /** Token address for icon lookup */
  tokenAddress?: string;
  /** Optional fallback staging address for icons */
  stagingTokenAddress?: string;
  /** Chain the token lives on — used for icon URL and network badge */
  caipChainId?: CaipChainId;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether this is the "Other" option */
  isOther?: boolean;
  /** Callback when card is pressed. Omit for non-interactive cards. */
  onPress?: () => void;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * AssetCard component for displaying a selectable token card
 * Used in the SpendingLimit screen for quick token selection
 */
const AssetCard: React.FC<AssetCardProps> = ({
  symbol,
  tokenAddress,
  stagingTokenAddress,
  caipChainId,
  isSelected,
  isOther = false,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  const resolvedChainId = caipChainId ?? LINEA_CAIP_CHAIN_ID;
  const resolvedTokenAddress = tokenAddress || stagingTokenAddress;

  const iconUrl =
    !isOther && resolvedTokenAddress
      ? buildTokenIconUrl(resolvedChainId, resolvedTokenAddress)
      : null;

  const networkImage = getNetworkImageSource({
    chainId: safeFormatChainIdToHex(resolvedChainId) as `0x${string}`,
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      style={tw.style('flex-1')}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName={`
          h-[90px] rounded-lg
          ${isSelected ? 'bg-text-default' : 'bg-background-muted'}
          px-2 py-3
        `}
      >
        {!isOther && iconUrl && (
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            style={tw.style('self-center')}
            badgeContainerProps={{ testID: 'badge-wrapper-badge' }}
            badge={networkImage ? <BadgeNetwork src={networkImage} /> : null}
          >
            <AvatarToken
              name={symbol}
              src={{ uri: iconUrl }}
              size={AvatarTokenSize.Sm}
              testID="token-avatar-image"
            />
          </BadgeWrapper>
        )}
        {isOther && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <AvatarNetwork
              size={AvatarNetworkSize.Sm}
              name="Base"
              src={getNetworkImageSource({
                chainId: cardNetworkInfos.base.caipChainId,
              })}
              style={tw.style('rounded-full overflow-hidden')}
            />
            <AvatarNetwork
              size={AvatarNetworkSize.Sm}
              name="Solana"
              src={getNetworkImageSource({
                chainId: cardNetworkInfos.solana.caipChainId,
              })}
              style={tw.style('-ml-2 rounded-full overflow-hidden')}
            />
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              style={tw.style(
                'w-6 h-6 -ml-2 rounded-full bg-background-default',
              )}
            >
              <Icon
                name={IconName.MoreHorizontal}
                size={IconSize.Xs}
                color={IconColor.PrimaryDefault}
              />
            </Box>
          </Box>
        )}

        <Text
          variant={TextVariant.BodySm}
          twClassName={`
            font-medium mt-1
            ${isSelected ? 'text-background-default' : 'text-text-default'}
          `}
        >
          {symbol}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

export default AssetCard;
