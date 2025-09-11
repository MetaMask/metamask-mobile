import React, { useMemo } from 'react';
import { ImageSourcePropType } from 'react-native';
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
import imageIcons from '../../../../../../images/image-icons';
import { CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS } from '../../../../Earn/utils/tempLending';

const ContractTag = ({
  contractName,
  contractAddress,
  useBlockieIcon = false,
}: ContractTagProps) => {
  // A set of addresses for the Aave V3 pool contracts
  const aaveAddresses = useMemo(
    () =>
      new Set<string>(
        Object.values(CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS).map(
          (address) => address.toLowerCase(),
        ),
      ),
    [],
  );

  return (
    <TagBase
      startAccessory={
        aaveAddresses.has(contractAddress.toLowerCase()) ? (
          <Avatar
            variant={AvatarVariant.Network}
            size={AvatarSize.Xs}
            name={contractName}
            imageSource={imageIcons.AAVE as ImageSourcePropType}
          />
        ) : (
          <Avatar
            variant={AvatarVariant.Account}
            size={AvatarSize.Xs}
            accountAddress={contractAddress}
            type={
              useBlockieIcon
                ? AvatarAccountType.Blockies
                : AvatarAccountType.JazzIcon
            }
          />
        )
      }
      shape={TagShape.Pill}
      severity={TagSeverity.Neutral}
    >
      <Text>{contractName}</Text>
    </TagBase>
  );
};

export default ContractTag;
