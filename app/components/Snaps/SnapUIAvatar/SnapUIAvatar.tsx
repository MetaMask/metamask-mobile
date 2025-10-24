import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { isEvmAccountType } from '@metamask/keyring-api';
import { selectAvatarAccountType } from '../../../selectors/settings';
import AvatarAccount from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectAccountGroupsByAddress } from '../../../selectors/multichainAccounts/accounts';
import { RootState } from '../../../reducers';

export const DIAMETERS: Record<string, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
};

export const SNAP_UI_AVATAR_TEST_ID = 'snap-ui-avatar';

export interface SnapUIAvatarProps {
  // The address must be a CAIP-10 string.
  address: string;
  size?: AvatarSize;
}

export const SnapUIAvatar: React.FunctionComponent<SnapUIAvatarProps> = ({
  address: caipAddress,
  size = AvatarSize.Md,
}) => {
  const { address } = useMemo(
    () => parseCaipAccountId(caipAddress as CaipAccountId),
    [caipAddress],
  );
  const avatarAccountType = useSelector(selectAvatarAccountType);

  const useAccountGroups = useSelector(selectMultichainAccountsState2Enabled);

  const accountGroups = useSelector((state: RootState) =>
    selectAccountGroupsByAddress(state, [address]),
  );

  const accountGroupAddress = accountGroups[0]?.accounts.find((account) =>
    isEvmAccountType(account.type),
  )?.address;

  // Display the account group address if it exists as the default.
  const displayAddress =
    useAccountGroups && accountGroupAddress ? accountGroupAddress : address;

  return (
    <AvatarAccount
      type={avatarAccountType}
      accountAddress={displayAddress}
      size={size}
      testID={SNAP_UI_AVATAR_TEST_ID}
    />
  );
};
