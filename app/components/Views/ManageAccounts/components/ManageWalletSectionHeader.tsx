import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import {
  getManageAccountSectionHeaderId,
  getManageAccountSectionHeaderRemoveId,
} from '../ManageAccounts.testIds';

export interface ManageWalletSectionHeaderProps {
  /** Wallet display name rendered as the section title. */
  walletName: string;
  /** When true, shows a Locked label and lock icon. */
  isLocked?: boolean;
  /** When provided, shows a Remove control. */
  onRemove?: () => void;
}

/** Wallet section header for the Manage Accounts screen. */
const ManageWalletSectionHeader = ({
  walletName,
  isLocked = false,
  onRemove,
}: ManageWalletSectionHeaderProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-2"
    testID={getManageAccountSectionHeaderId(walletName)}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      fontWeight={FontWeight.Medium}
      twClassName="flex-1"
    >
      {walletName}
    </Text>
    {isLocked ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="ml-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={`${getManageAccountSectionHeaderId(walletName)}-lock-label`}
        >
          {strings('multichain_accounts.manage_accounts.locked')}
        </Text>
        <Icon
          name={IconName.Lock}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          twClassName="ml-1"
        />
      </Box>
    ) : null}
    {onRemove ? (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.ErrorDefault}
        fontWeight={FontWeight.Medium}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={strings(
          'multichain_accounts.manage_accounts.remove_wallet',
        )}
        testID={getManageAccountSectionHeaderRemoveId(walletName)}
        twClassName="ml-3"
      >
        {strings('multichain_accounts.manage_accounts.remove')}
      </Text>
    ) : null}
  </Box>
);

export default ManageWalletSectionHeader;
