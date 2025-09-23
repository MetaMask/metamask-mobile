import React, { useMemo } from 'react';
import {
  CaipAccountId,
  isHexString,
  parseCaipAccountId,
} from '@metamask/utils';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { SnapUIAvatar } from '../SnapUIAvatar/SnapUIAvatar';
import { shortenString } from '../../../util/notifications/methods';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { Box } from '../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../UI/Box/box.types';
import { useDisplayName } from './useDisplayName';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

export interface SnapUIAddressProps {
  // The address must be a CAIP-10 string.
  address: string;
  // This is not currently exposed to Snaps.
  avatarSize?: AvatarSize;
  truncate?: boolean;
  displayName?: boolean;
  avatar?: boolean;
  color?: string;
}

export const SnapUIAddress: React.FunctionComponent<SnapUIAddressProps> = ({
  address,
  avatarSize = AvatarSize.Md,
  truncate = true,
  displayName = false,
  avatar = true,
  color,
}) => {
  const caipIdentifier = useMemo(() => {
    if (isHexString(address)) {
      // For legacy address inputs we assume them to be Ethereum addresses.
      // NOTE: This means the chain ID is not gonna be reliable.
      return `eip155:1:${address}`;
    }

    return address;
  }, [address]);

  const parsed = useMemo(
    () => parseCaipAccountId(caipIdentifier as CaipAccountId),
    [caipIdentifier],
  );

  // For EVM addresses, we make sure they are checksummed.
  const transformedAddress =
    parsed.chain.namespace === 'eip155'
      ? toChecksumHexAddress(parsed.address)
      : parsed.address;

  const formattedAddress = truncate
    ? shortenString(transformedAddress)
    : address;

  const name = useDisplayName(parsed);

  // TODO: This component should inherit font color, e.g. for link.
  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={8}
    >
      {avatar && <SnapUIAvatar address={caipIdentifier} size={avatarSize} />}
      <Text variant={TextVariant.BodyMD} color={color}>
        {displayName && name ? name : formattedAddress}
      </Text>
    </Box>
  );
};
