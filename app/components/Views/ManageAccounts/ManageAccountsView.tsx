import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AccountGroupObject } from '@metamask/account-tree-controller';
import { strings } from '../../../../locales/i18n';
import type { AccountAvatarVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import AccountListFooter from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListFooter';
import AddWalletButton from '../../../component-library/components-temp/MultichainAccounts/AddWalletButton';
import ManageAccountRow, {
  ManageAccountRowVariant,
} from './components/ManageAccountRow';
import ManageWalletSectionHeader from './components/ManageWalletSectionHeader';
import {
  ManageAccountsViewSelectorsIDs,
  getManageAccountAddAccountFooterId,
} from './ManageAccounts.testIds';

/** One wallet section of the management list. */
export interface ManageAccountsSection {
  /** Wallet display name, rendered as the section header. */
  walletName: string;
  /** Account groups belonging to this wallet, in display order. */
  groups: AccountGroupObject[];
  /** Wallet ID used by the "Add account" footer to resolve the keyring. */
  walletId?: string;
  /**
   * Trailing-action variant per group ID. Groups without an entry
   * fall back to the hide toggle.
   */
  rowVariantByGroupId?: Partial<
    Record<AccountGroupId, ManageAccountRowVariant>
  >;
  /** Whether the wallet is locked (renders the Locked header state). */
  isLocked?: boolean;
  /** When provided, the section header renders its Remove control. */
  onRemoveWallet?: () => void;
  /**
   * Whether to render the "Add account" footer for this section.
   * Requires `walletId`.
   */
  showsAddAccountFooter?: boolean;
}

export interface ManageAccountsViewProps {
  /** Wallet sections in display order. */
  sections: ManageAccountsSection[];
  /** Hidden flag per account group ID; missing key means visible. */
  isHiddenByGroupId: Partial<Record<AccountGroupId, boolean>>;
  /**
   * Hide / unhide handler. `nextHidden` is the value being applied
   * (`true` = hide, `false` = unhide).
   */
  onToggleHidden: (groupId: AccountGroupId, nextHidden: boolean) => void;
  /** Row-level remove handler, used when the row variant includes remove. */
  onRemoveAccount?: (groupId: AccountGroupId) => void;
  /**
   * Called with the wallet name after a new account is created.
   * Required for the per-section "Add account" footer to render.
   */
  onAddAccount?: (walletName: string) => void;
  /** Add-wallet CTA handler. Renders the button only when provided. */
  onAddWallet?: () => void;
  /** User's avatar preference, forwarded to every row. */
  avatarAccountType: AccountAvatarVariant;
  /** Back action. */
  onBack: () => void;
  testID?: string;
}

const shouldShowSectionDivider = (
  sectionIndex: number,
  sectionCount: number,
): boolean => sectionIndex < sectionCount - 1;

const ManageAccountsView = ({
  sections,
  isHiddenByGroupId,
  onToggleHidden,
  onRemoveAccount,
  onAddAccount,
  onAddWallet,
  avatarAccountType,
  onBack,
  testID = ManageAccountsViewSelectorsIDs.CONTAINER,
}: ManageAccountsViewProps) => {
  const tw = useTailwind();

  const renderRows = useCallback(
    (section: ManageAccountsSection) =>
      section.groups.map((accountGroup) => (
        <ManageAccountRow
          key={accountGroup.id}
          accountGroup={accountGroup}
          isHidden={isHiddenByGroupId[accountGroup.id] ?? false}
          variant={
            section.rowVariantByGroupId?.[accountGroup.id] ??
            ManageAccountRowVariant.Hide
          }
          onToggleHidden={onToggleHidden}
          onRemove={onRemoveAccount}
          avatarAccountType={avatarAccountType}
        />
      )),
    [isHiddenByGroupId, onToggleHidden, onRemoveAccount, avatarAccountType],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={testID}
    >
      <HeaderStandard
        title={strings('multichain_accounts.manage_accounts.title')}
        onBack={onBack}
        backButtonProps={{ testID: ManageAccountsViewSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        style={tw.style('flex-1')}
        testID={ManageAccountsViewSelectorsIDs.ACCOUNT_LIST}
        contentContainerStyle={tw.style('pb-2')}
      >
        {sections.map((section, sectionIndex) => (
          <Box key={`${sectionIndex}-${section.walletName}`}>
            <ManageWalletSectionHeader
              walletName={section.walletName}
              isLocked={section.isLocked}
              onRemove={section.onRemoveWallet}
            />
            {renderRows(section)}
            {section.showsAddAccountFooter && onAddAccount ? (
              <Box
                testID={getManageAccountAddAccountFooterId(section.walletName)}
              >
                <AccountListFooter
                  walletId={section.walletId as AccountWalletId}
                  onAccountCreated={() => onAddAccount(section.walletName)}
                />
              </Box>
            ) : null}
            {shouldShowSectionDivider(sectionIndex, sections.length) && (
              <Box twClassName="mx-4 my-2 h-px bg-border-muted" />
            )}
          </Box>
        ))}
      </ScrollView>
      {onAddWallet ? (
        <AddWalletButton
          onPress={onAddWallet}
          testID={ManageAccountsViewSelectorsIDs.ADD_WALLET_BUTTON}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default ManageAccountsView;
