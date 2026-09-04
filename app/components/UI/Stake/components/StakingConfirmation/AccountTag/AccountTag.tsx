import React from 'react';
import {
  AvatarAccount,
  AvatarAccountSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar';
import { getAvatarAccountVariant } from '../../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { AccountTagProps } from './AccountTag.types';

const AccountTag = ({
  accountAddress,
  accountName,
  avatarAccountType = AvatarAccountType.Maskicon,
}: AccountTagProps) => (
  <Tag
    twClassName="rounded-full px-2 py-0.5"
    startAccessory={
      <AvatarAccount
        twClassName="rounded bg-default"
        size={AvatarAccountSize.Xs}
        address={accountAddress}
        variant={getAvatarAccountVariant(avatarAccountType)}
      />
    }
    severity={TagSeverity.Info}
  >
    <Text color={TextColor.InfoDefault}>{accountName ?? accountAddress}</Text>
  </Tag>
);

export default AccountTag;
