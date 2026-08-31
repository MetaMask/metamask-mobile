import React from 'react';
import TagBase, {
  TagShape,
  TagSeverity,
} from '../../../../../../component-library/base-components/TagBase';
import Avatar, {
  AvatarVariant,
  AvatarSize,
  AvatarAccountType,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { AccountTagProps } from './AccountTag.types';

const AccountTag = ({
  accountAddress,
  accountName,
  avatarAccountType = AvatarAccountType.Maskicon,
}: AccountTagProps) => (
  <TagBase
    startAccessory={
      <Avatar
        variant={AvatarVariant.Account}
        size={AvatarSize.Xs}
        accountAddress={accountAddress}
        type={avatarAccountType}
      />
    }
    shape={TagShape.Pill}
    severity={TagSeverity.Info}
  >
    {accountName ?? accountAddress}
  </TagBase>
);

export default AccountTag;
