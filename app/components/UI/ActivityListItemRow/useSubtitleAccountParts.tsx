import React from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { getAvatarAccountVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../selectors/settings';
import type { ActivityListItemRowContent } from './ActivityListItemRow.types';
import { View } from '../primitives/View';

/**
 * Builds the structured "To: <avatar> Name" subtitle for rows whose
 * counterparty resolved to one of the user's own accounts, using the same
 * account avatar the Accounts list shows.
 */
export function useSubtitleAccountParts(
  content: ActivityListItemRowContent,
  testIdSuffix: string | number | undefined,
): { pre: string; avatar: React.ReactNode; name: string } | undefined {
  const avatarVariant = getAvatarAccountVariant(
    useSelector(selectAvatarAccountType),
  );
  const account = content.subtitleAccount;
  if (!account) {
    return undefined;
  }

  return {
    pre: `${account.prefix}: `,
    avatar: (
      <View
        className="mr-1"
        testID={`activity-subtitle-account-avatar-${testIdSuffix}`}
      >
        <AvatarAccount
          address={account.address}
          variant={avatarVariant}
          size={AvatarBaseSize.Xs}
        />
      </View>
    ),
    name: account.name,
  };
}
