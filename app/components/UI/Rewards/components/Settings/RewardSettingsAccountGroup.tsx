import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { isEmpty } from 'lodash';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { AccountGroupWithOptInStatus } from '../../hooks/useRewardOptinSummary';

// Enhanced props interface with pre-computed data for performance
interface RewardSettingsAccountGroupProps {
  accountGroup: AccountGroupWithOptInStatus;
  evmAddress?: string;
  avatarAccountType: AvatarAccountType;
  accountStatusText: string;
  totalAccounts: number;
  isLinkable: boolean;
  onLinkAccountGroup: () => void;
  onShowAddresses: () => void;
}

// Optimized and memoized component that receives pre-computed data
const RewardSettingsAccountGroup = memo<RewardSettingsAccountGroupProps>(
  ({
    accountGroup,
    evmAddress,
    avatarAccountType,
    accountStatusText,
    isLinkable,
    onLinkAccountGroup,
    onShowAddresses,
  }) => {
    const tw = useTailwind();

    // Early return after hooks to maintain hook order
    if (
      isEmpty(accountGroup.optedInAccounts) &&
      isEmpty(accountGroup.optedOutAccounts)
    ) {
      return null;
    }

    return (
      <Box
        twClassName="flex-row items-center justify-between px-3 py-3 rounded-lg"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {/* Avatar - use EVM address or fallback to zero address */}
        <Box twClassName="mr-3">
          <AvatarAccount
            accountAddress={
              evmAddress || '0x0000000000000000000000000000000000000000'
            }
            type={avatarAccountType}
            size={AvatarSize.Md}
          />
        </Box>

        {/* Account Name */}
        <Box twClassName={`flex-1 ${!evmAddress ? 'mr-3' : ''}`}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {accountGroup.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative mt-1"
          >
            {accountStatusText}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          {/* QR Code button to show account addresses */}
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'p-3 rounded-lg border border-muted bg-transparent',
                pressed && 'bg-pressed',
              )
            }
            onPress={onShowAddresses}
            testID={`rewards-account-addresses-${accountGroup.id}`}
          >
            <Icon name={IconName.QrCode} color={IconColor.Default} />
          </Pressable>

          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isDisabled={!isLinkable}
            onPress={onLinkAccountGroup}
          >
            {strings('rewards.link_account')}
          </Button>
        </Box>
      </Box>
    );
  },
);

// Add display name for debugging
RewardSettingsAccountGroup.displayName = 'RewardSettingsAccountGroup';

export default RewardSettingsAccountGroup;
export type { RewardSettingsAccountGroupProps };
