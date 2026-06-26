import React from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarBaseSize,
  Box,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { NameType } from '../../../UI/Name/Name.types';
import { useAccountNames } from '../../../hooks/DisplayName/useAccountNames';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { renderShortAddress } from '../../../../util/address';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

function SmartAccountUpgradeHero({
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

  return (
    <Box twClassName="flex-row items-center gap-3">
      {address ? (
        <AvatarAccount
          address={address}
          variant={accountVariant}
          size={AvatarBaseSize.Lg}
        />
      ) : null}
      <Text
        variant={TextVariant.DisplayMd}
        twClassName="shrink"
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {accountName ?? renderShortAddress(address)}
      </Text>
    </Box>
  );
}

/**
 * EIP-7702 smart account upgrade details: the upgraded account (avatar + name)
 * with the standard metadata and network fee. No asset is moved, so there's no
 * total — only the gas fee (matching the Approval layout).
 */
export function SmartAccountUpgradeDetails({
  item,
}: {
  item: ActivityListItem;
}) {
  const address =
    ('from' in item.data ? item.data.from : undefined) ??
    ('to' in item.data ? item.data.to : undefined) ??
    '';

  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={
        <SmartAccountUpgradeHero address={address} chainId={item.chainId} />
      }
      showTotal={false}
    />
  );
}
