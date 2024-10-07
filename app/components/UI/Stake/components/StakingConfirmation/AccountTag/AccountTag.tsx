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
  useBlockieIcon = false,
}: AccountTagProps) => (
  <TagBase
    startAccessory={
      <Avatar
        variant={AvatarVariant.Account}
        size={AvatarSize.Xs}
        accountAddress={accountAddress}
        type={
          useBlockieIcon
            ? AvatarAccountType.Blockies
            : AvatarAccountType.JazzIcon
        }
      />
    }
    shape={TagShape.Pill}
    severity={TagSeverity.Info}
  >
    {accountName ?? accountAddress}
  </TagBase>
);

export default AccountTag;
