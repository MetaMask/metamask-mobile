import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { RootState } from '../../../../../reducers';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';

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
   * Text variant for the account name
   * @default TextVariant.BodyMd
   */
  textVariant?: TextVariant;
  /**
   * Font weight for the account name
   * @default FontWeight.Medium
   */
  fontWeight?: FontWeight;
}

const AccountDisplayItem: React.FC<AccountDisplayItemProps> = ({
  account,
  avatarSize = AvatarSize.Md,
  isCurrentAccount = false,
  twClassName = '',
  textVariant = TextVariant.BodyMd,
  fontWeight = FontWeight.Medium,
}) => {
  const tw = useTailwind();

  // Get account avatar type preference
  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  return (
    <Box
      style={tw.style(
        'flex-row items-center gap-3',
        isCurrentAccount && 'bg-pressed rounded-lg',
        twClassName,
      )}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
    >
      <Avatar
        variant={AvatarVariant.Account}
        size={avatarSize}
        accountAddress={account.address}
        type={accountAvatarType}
      />

      <Text variant={textVariant} fontWeight={fontWeight}>
        {account.metadata.name}
      </Text>
    </Box>
  );
};

export default AccountDisplayItem;
