import { createSelector } from 'reselect';
import type { AccountGroupId } from '@metamask/account-api';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import type { RootState } from '../../reducers';
import {
  selectAccountGroupsByWallet,
  selectAccountGroupById,
} from './accountTreeController';
import type { AccountSection } from '../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.types';

/**
 * Selector that returns account groups organized by wallet sections,
 * excluding groups marked as hidden (`metadata.hidden === true`).
 */
export const selectVisibleAccountGroupsByWallet = createSelector(
  [selectAccountGroupsByWallet],
  (accountSections): AccountSection[] =>
    accountSections.map((section) => ({
      ...section,
      data: section.data.filter(
        (group: AccountGroupObject) => !group.metadata?.hidden,
      ),
    })),
);

/**
 * Selector factory that returns whether a given account group is hidden.
 *
 * @param groupId - The ID of the account group to inspect
 * @returns A selector that returns true if the group is hidden, false otherwise
 */
export const selectAccountGroupHidden = (groupId: AccountGroupId) =>
  createSelector(
    (state: RootState) => selectAccountGroupById(state, groupId),
    (group: AccountGroupObject | undefined): boolean =>
      Boolean(group?.metadata?.hidden),
  );
