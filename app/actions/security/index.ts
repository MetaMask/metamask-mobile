/* eslint-disable import-x/prefer-default-export */
import type { Action as ReduxAction } from 'redux';

export enum ActionType {
  SET_ALLOW_LOGIN_WITH_REMEMBER_ME = 'SET_ALLOW_LOGIN_WITH_REMEMBER_ME',
  SET_AUTOMATIC_SECURITY_CHECKS = 'SET_AUTOMATIC_SECURITY_CHECKS',
  USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION = 'USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION',
  SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN = 'SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN',
  SET_DATA_COLLECTION_FOR_MARKETING = 'SET_DATA_COLLECTION_FOR_MARKETING',
  SET_NFT_AUTO_DETECTION_MODAL_OPEN = 'SET_NFT_AUTO_DETECTION_MODAL_OPEN',
  SET_MULTI_RPC_MIGRATION_MODAL_OPEN = 'SET_MULTI_RPC_MIGRATION_MODAL_OPEN',
  SET_OS_AUTH_ENABLED = 'SET_OS_AUTH_ENABLED',
}

export interface AllowLoginWithRememberMeUpdated
  extends ReduxAction<ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME> {
  enabled: boolean;
}

export interface SetNftAutoDetectionModalOpen
  extends ReduxAction<ActionType.SET_NFT_AUTO_DETECTION_MODAL_OPEN> {
  open: boolean;
}

export interface SetMultiRpcMigrationModalOpen
  extends ReduxAction<ActionType.SET_MULTI_RPC_MIGRATION_MODAL_OPEN> {
  open: boolean;
}

export interface SetDataCollectionForMarketing
  extends ReduxAction<ActionType.SET_DATA_COLLECTION_FOR_MARKETING> {
  enabled: boolean;
  /**
   * Updates the Redux preference without copying it into AnalyticsController.
   * Used when a failed controller write must not record a new consent decision.
   */
  skipControllerSync?: boolean;
}

export interface SetOsAuthEnabled
  extends ReduxAction<ActionType.SET_OS_AUTH_ENABLED> {
  enabled: boolean;
}

export type Action =
  | AllowLoginWithRememberMeUpdated
  | SetDataCollectionForMarketing
  | SetNftAutoDetectionModalOpen
  | SetMultiRpcMigrationModalOpen
  | SetOsAuthEnabled;

export const setAllowLoginWithRememberMe = (
  enabled: boolean,
): AllowLoginWithRememberMeUpdated => ({
  type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
  enabled,
});

export const setNftAutoDetectionModalOpen = (
  open: boolean,
): SetNftAutoDetectionModalOpen => ({
  type: ActionType.SET_NFT_AUTO_DETECTION_MODAL_OPEN,
  open,
});

export const setMultiRpcMigrationModalOpen = (
  open: boolean,
): SetMultiRpcMigrationModalOpen => ({
  type: ActionType.SET_MULTI_RPC_MIGRATION_MODAL_OPEN,
  open,
});

export const setDataCollectionForMarketing = (
  enabled: boolean,
  options?: { skipControllerSync?: boolean },
): SetDataCollectionForMarketing => ({
  type: ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
  enabled,
  ...(options?.skipControllerSync ? { skipControllerSync: true } : {}),
});

export const setOsAuthEnabled = (enabled: boolean): SetOsAuthEnabled => ({
  type: ActionType.SET_OS_AUTH_ENABLED,
  enabled,
});
