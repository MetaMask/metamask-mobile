import React from 'react';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../../AssetOverview/Balance/Balance';
import { buildTokenIconUrl } from '../../../util/buildTokenIconUrl';
import { LINEA_CAIP_CHAIN_ID } from '../../../util/buildTokenList';
import { safeFormatChainIdToHex } from '../../../util/safeFormatChainIdToHex';

export interface AssetCardProps {
  /** Token symbol (e.g., 'mUSD', 'USDC') or 'Other' */
  symbol: string;
  /** Token address for icon lookup */
  tokenAddress?: string;
  /** Optional fallback staging address for icons */
  stagingTokenAddress?: string;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether this is the "Other" option */
  isOther?: boolean;
  /** Callback when card is pressed */
  onPress: () => void;
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
  isSelected,
  isOther = false,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  const iconUrl =
    !isOther && (tokenAddress || stagingTokenAddress)
      ? buildTokenIconUrl(
          LINEA_CAIP_CHAIN_ID,
          tokenAddress || stagingTokenAddress || '',
        )
      : null;

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
            badgePosition={BadgePosition.BottomRight}
            style={tw.style('self-center')}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={NetworkBadgeSource(
                  safeFormatChainIdToHex(LINEA_CAIP_CHAIN_ID) as `0x${string}`,
                )}
              />
            }
          >
            <AvatarToken
              name={symbol}
              imageSource={{ uri: iconUrl }}
              size={AvatarSize.Sm}
            />
          </BadgeWrapper>
        )}
        {isOther && (
          <Icon
            name={IconName.MoreHorizontal}
            size={IconSize.Lg}
            color={isSelected ? IconColor.IconMuted : IconColor.IconDefault}
          />
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
