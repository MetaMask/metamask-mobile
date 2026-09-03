import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AccountGroupObject } from '@metamask/account-tree-controller';
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

/**
 * One wallet section of the management list.
 *
 * The view layer decides each row's trailing-action variant from account
 * type (entropy/HD → hide; hardware → hide + remove; imported → remove;
 * snap → none) and injects it per group — the row only renders what it's
 * given.
 */
export interface ManageAccountsSection {
  /** Wallet display name, rendered as the section header. */
  walletName: string;
  /** Account groups belonging to this wallet, in display order. */
  groups: AccountGroupObject[];
  /**
   * Account-wallet ID backing this section. Required for the "Add account"
   * footer (the footer resolves the keyring from the wallets map by this ID).
   */
  walletId?: string;
  /**
   * Trailing-action variant per group ID of this section. Groups without an
   * entry fall back to the hide toggle (Phase 1 behavior) — the wiring lane
   * owns the account-type → variant mapping and should map every group
   * explicitly (entropy/HD → Hide, hardware → HideAndRemove, imported →
   * Remove, snap → None).
   */
  rowVariantByGroupId?: Partial<
    Record<AccountGroupId, ManageAccountRowVariant>
  >;
  /** Whether the wallet's entropy is locked (renders the Locked header state). */
  isLocked?: boolean;
  /**
   * Optional wallet-level remove handler. When provided, the section header
   * renders its Remove control (hardware-section use). Omit for unlocked
   * entropy wallets (design-TBD) and imported sections (no wallet-level
   * removal in Figma).
   */
  onRemoveWallet?: () => void;
  /**
   * Whether to render the "Add account" footer for this section
   * (entropy / hardware wallets only — spec §6 keeps it out of
   * imported-accounts-only sections). Requires `walletId`.
   */
  showsAddAccountFooter?: boolean;
}

export interface ManageAccountsViewProps {
  /**
   * Wallet sections in display order. Arrives pre-computed from the
   * integration lane (selectors own the pinned/wallet section model).
   */
  sections: ManageAccountsSection[];
  /** Hidden flag per account group ID; missing key means visible. */
  isHiddenByGroupId: Partial<Record<AccountGroupId, boolean>>;
  /**
   * Hide / unhide handler. `nextHidden` is the value being applied
   * (`true` = hide, `false` = unhide).
   */
  onToggleHidden: (groupId: AccountGroupId, nextHidden: boolean) => void;
  /**
   * Optional row-level remove handler, forwarded to rows whose variant
   * includes the remove affordance.
   */
  onRemoveAccount?: (groupId: AccountGroupId) => void;
  /**
   * Optional "Add account" handler. Its existence gates the per-section
   * "Add account" footers (entropy / hardware sections only — imported
   * sections never opt in, spec §6). The reused `AccountListFooter` owns the
   * creation flow itself; this callback is invoked with the section's wallet
   * name when the footer reports a newly created account group.
   */
  onAddAccount?: (walletName: string) => void;
  /** Optional Add-wallet CTA handler. Renders the button only when provided. */
  onAddWallet?: () => void;
  /** User's avatar preference, forwarded to every row. */
  avatarAccountType: AccountAvatarVariant;
  /** Back action (wired to `navigation.goBack()` by the integration lane). */
  onBack: () => void;
  testID?: string;
}

/**
 * Manage accounts screen — visuals only.
 *
 * Visual host: sections, hidden flags, trailing-action variants and handlers
 * are injected via props (no Engine, no Redux, no route registration here).
 * Every new affordance (add-account footer, add-wallet CTA, remove controls)
 * renders only when its callback/flag is supplied, so the wiring lane can
 * adopt them incrementally.
 */
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
        title="Manage accounts"
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
            {/* Section divider (spec token: border-muted). Rendered between
                wallet blocks only, matching the Figma rhythm. */}
            {sectionIndex < sections.length - 1 ? (
              <Box twClassName="mx-4 my-2 h-px bg-border-muted" />
            ) : null}
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
