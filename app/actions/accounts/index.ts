import { Action } from 'redux';

/**
 * Deference action types available for different RPC event flow
 */
export enum AccountsActionType {
  SET_RELOAD_ACCOUNTS = 'SET_RELOAD_ACCOUNTS',
}

/**
 * Extend redux Action interface to add rpcName, eventStage and error properties
 */
export interface iAccountActions extends Action {
  reloadAccounts: boolean;
}

/**
 * setReloadAccounts action creator
 * @param {boolean} reloadAccounts: true to reload accounts, false otherwise
 * @returns {iAccountActions} - the action object to set reloadAccounts
 */
export function setReloadAccounts(reloadAccounts: boolean): iAccountActions {
  return {
    type: AccountsActionType.SET_RELOAD_ACCOUNTS,
    reloadAccounts,
  };
}
