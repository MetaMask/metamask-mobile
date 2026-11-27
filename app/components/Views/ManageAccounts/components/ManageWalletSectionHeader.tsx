import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import {
  getManageAccountSectionHeaderId,
  getManageAccountSectionHeaderRemoveId,
  getManageAccountSectionHeaderLockId,
} from '../ManageAccounts.testIds';

export interface ManageWalletSectionHeaderProps {
  /** Wallet display name rendered as the section title. */
  walletName: string;
  /** When true, renders the locked-state indicator container. */
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
    className="px-4 py-2"
    testID={getManageAccountSectionHeaderId(walletName)}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      fontWeight={FontWeight.Medium}
      className="flex-1"
    >
      {walletName}
    </Text>
    {isLocked ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        className="ml-3"
        testID={getManageAccountSectionHeaderLockId(walletName)}
      />
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
        className="ml-3"
      >
        {strings('multichain_accounts.manage_accounts.remove')}
      </Text>
    ) : null}
  </Box>
);

export default ManageWalletSectionHeader;
