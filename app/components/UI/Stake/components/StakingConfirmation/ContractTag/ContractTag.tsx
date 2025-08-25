import React from 'react';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import Text from '../../../../../../component-library/components/Texts/Text';
import { ContractTagProps } from './ContractTag.types';
import Avatar, {
  AvatarVariant,
  AvatarSize,
  AvatarAccountType,
} from '../../../../../../component-library/components/Avatars/Avatar';

const ContractTag = ({
  contractName,
  contractAddress,
  avatarStyle = AvatarAccountType.Maskicon,
}: ContractTagProps) => (
  <TagBase
    startAccessory={
      <Avatar
        variant={AvatarVariant.Account}
        size={AvatarSize.Xs}
        accountAddress={contractAddress}
        type={avatarStyle}
      />
    }
    shape={TagShape.Pill}
    severity={TagSeverity.Neutral}
  >
    <Text>{contractName}</Text>
  </TagBase>
);

export default ContractTag;
