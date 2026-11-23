import React, { useMemo } from 'react';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarNetwork,
  AvatarNetworkSize,
  Tag,
  TagSeverity,
  Text,
} from '@metamask/design-system-react-native';
import { ContractTagProps } from './ContractTag.types';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar';
import { getAvatarAccountVariant } from '../../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import imageIcons from '../../../../../../images/image-icons';
import { CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS } from '../../../../Earn/utils/tempLending';

const ContractTag = ({
  contractName,
  contractAddress,
  avatarAccountType = AvatarAccountType.Maskicon,
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
    <Tag
      twClassName="rounded-full px-2 py-0.5 bg-alternative"
      startAccessory={
        aaveAddresses.has(contractAddress.toLowerCase()) ? (
          <AvatarNetwork
            twClassName="rounded bg-default"
            size={AvatarNetworkSize.Xs}
            name={contractName}
            src={
              imageIcons.AAVE as React.ComponentProps<
                typeof AvatarNetwork
              >['src']
            }
          />
        ) : (
          <AvatarAccount
            twClassName="rounded bg-default"
            size={AvatarAccountSize.Xs}
            address={contractAddress}
            variant={getAvatarAccountVariant(avatarAccountType)}
          />
        )
      }
      severity={TagSeverity.Neutral}
    >
      <Text>{contractName}</Text>
    </Tag>
  );
};

export default ContractTag;
