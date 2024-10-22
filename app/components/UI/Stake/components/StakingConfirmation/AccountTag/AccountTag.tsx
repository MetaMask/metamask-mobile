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
  address,
  name,
  useBlockieIcon = false,
}: AccountTagProps) => (
  <TagBase
    startAccessory={
      <Avatar
        variant={AvatarVariant.Account}
        size={AvatarSize.Xs}
        accountAddress={address}
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
    {name ?? address}
  </TagBase>
);

export default AccountTag;
