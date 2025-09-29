import React from 'react';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { formatAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

export interface AccountDisplayItemProps {
  /**
   * The account to display
   */
  account: InternalAccount;
  /**
   * Size of the avatar
   * @default AvatarSize.Md
   */
  avatarSize?: AvatarSize;
  /**
   * Whether to show as current account (with pressed background)
   * @default false
   */
  isCurrentAccount?: boolean;
  /**
   * Additional styling classes
   */
  twClassName?: string;
  /**
  /**
   * Specific caip chain ID to display network icon for (optional)
   * If not provided, will use the first available scope from the account
   */
  caipChainId?: string;
}

const AccountDisplayItem: React.FC<AccountDisplayItemProps> = ({
  account,
  twClassName = '',
  avatarSize = AvatarSize.Md,
  caipChainId,
}) => {
  const tw = useTailwind();
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  // Get the caipChainId to use - either provided or first from account scopes
  const targetCaipChainId = caipChainId || account.scopes?.[0];

  // Early return data if no valid chainId
  if (!targetCaipChainId) {
    return (
      <Box
        style={tw.style('flex-row items-center gap-3 h-12', twClassName)}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {formatAddress(account.address, 'short')}
        </Text>
      </Box>
    );
  }

  // Get network configuration and image source with error handling
  const networkConfig =
    networkConfigurations[
      targetCaipChainId as keyof typeof networkConfigurations
    ];
  const networkName = networkConfig?.name || 'Unknown Network';

  let networkImageSource;
  try {
    networkImageSource = getNetworkImageSource({
      chainId: targetCaipChainId,
    });
  } catch (error) {
    console.warn('Failed to get network image source:', error);
    networkImageSource = undefined;
  }

  return (
    <Box
      style={tw.style('flex-row items-center gap-3 h-12', twClassName)}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
    >
      {/* Network Avatar - Only show if we have valid network data */}
      <Avatar
        variant={AvatarVariant.Network}
        size={avatarSize}
        name={networkName}
        imageSource={networkImageSource}
      />

      {/* Account Address and Name */}
      <Text variant={TextVariant.BodySm} twClassName="text-alternative">
        {formatAddress(account.address, 'short')}
      </Text>
    </Box>
  );
};

export default AccountDisplayItem;
