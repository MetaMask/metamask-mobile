import React from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarBaseSize,
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { NameType } from '../../../UI/Name/Name.types';
import { useAccountNames } from '../../../hooks/DisplayName/useAccountNames';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { renderShortAddress } from '../../../../util/address';

export function ActivityDetailsAccountValue({
  address,
  chainId,
}: {
  address: string;
  chainId: string;
}) {
  const accountVariant = getAvatarAccountVariant(
    useSelector(selectAvatarAccountType),
  );
  const accountName = useAccountNames([
    {
      value: address,
      variation: chainId,
      type: NameType.EthereumAddress,
    },
  ])?.[0];
  const displayAddress = renderShortAddress(address);

  return (
    <Box twClassName="flex-row items-center justify-end gap-2 shrink">
      <AvatarAccount
        address={address}
        variant={accountVariant}
        size={AvatarBaseSize.Sm}
      />
      {accountName ? (
        <Box twClassName="flex-row items-center justify-end shrink">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="shrink text-right"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {accountName}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {' ('}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {displayAddress}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {')'}
          </Text>
        </Box>
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="shrink text-right"
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {displayAddress}
        </Text>
      )}
    </Box>
  );
}
