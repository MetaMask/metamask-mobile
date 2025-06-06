import { createSelector } from 'reselect';
import { RootState } from '../../reducers';

/**
 * Get the AccountTreeController state
 * @param state - Root redux state
 * @returns AccountTreeController state
 */
const selectAccountTreeControllerState = (state: RootState) => state.engine.backgroundState.AccountTreeController;

/**
 * Get account sections from AccountTreeController
 * For now, this returns a simple structure until the controller is fully integrated
 */
export const selectAccountSections = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeState) => {
    // TODO: Replace with actual AccountTreeController state structure
    // For now, return a simple hardcoded structure
    if (!accountTreeState?.accountTrees?.roots) {
      return [{
        title: 'Default Group',
        data: [],
      }];
    }

    return Object.values(accountTreeState.accountTrees.roots).map((root) => ({
      title: root.metadata.name,
      data: Object.values(root.groups).map((group) => group.accounts).flat(),
    }));
  }
);
