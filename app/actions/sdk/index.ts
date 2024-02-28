import type { Action as ReduxAction } from 'redux';
import { ConnectionProps } from '../../core/SDKConnect/Connection';
import { ApprovedHosts, SDKSessions } from '../../core/SDKConnect/SDKConnect';

export enum ActionType {
  RESET_CONNECTIONS = 'RESET_CONNECTIONS',
  UPDATE_CONNECTION = 'UPDATE_CONNECTION',
  REMOVE_CONNECTION = 'REMOVE_CONNECTION',
  ADD_CONNECTION = 'ADD_CONNECTION',
  REMOVE_APPROVED_HOST = 'REMOVE_APPROVWED_HOST',
  SET_APPROVED_HOST = 'SET_APPROVED_HOST',
  RESET_APPROVED_HOSTS = 'RESET_APPROVED_HOSTS',
  ADD_ANDROID_CONNECTION = 'ADD_ANDROID_CONNECTION',
  SET_CONNECTED = 'SET_CONNECTED',
  UPDATE_ANDROID_CONNECTION = 'UPDATE_ANDROID_CONNECTION',
  REMOVE_ANDROID_CONNECTION = 'REMOVE_ANDROID_CONNECTION',
  RESET_ANDROID_CONNECTIONS = 'RESET_ANDROID_CONNECTIONS',
}

export interface UpdateConnection
  extends ReduxAction<ActionType.UPDATE_CONNECTION> {
  channelId: string;
  connection: ConnectionProps;
}

export interface ResetConnection
  extends ReduxAction<ActionType.RESET_CONNECTIONS> {
  connections: SDKSessions;
}

export interface RemoveConnection
  extends ReduxAction<ActionType.REMOVE_CONNECTION> {
  channelId: string;
}

export interface AddConnection extends ReduxAction<ActionType.ADD_CONNECTION> {
  channelId: string;
  connection: ConnectionProps;
}

export interface RemoveApprovedHost
  extends ReduxAction<ActionType.REMOVE_APPROVED_HOST> {
  channelId: string;
}

export interface SetApprovedHost
  extends ReduxAction<ActionType.SET_APPROVED_HOST> {
  channelId: string;
  validUntil: number;
}

export interface ResetApprovedHosts
  extends ReduxAction<ActionType.RESET_APPROVED_HOSTS> {
  approvedHosts: ApprovedHosts;
}

export interface AddAndroidConnection
  extends ReduxAction<ActionType.ADD_ANDROID_CONNECTION> {
  channelId: string;
  connection: ConnectionProps;
}

export interface UpdateAndroidConnection
  extends ReduxAction<ActionType.UPDATE_ANDROID_CONNECTION> {
  channelId: string;
  connection: ConnectionProps;
}

export interface RemoveAndroidConnection
  extends ReduxAction<ActionType.REMOVE_ANDROID_CONNECTION> {
  channelId: string;
}

export interface ResetAndroidConnections
  extends ReduxAction<ActionType.RESET_ANDROID_CONNECTIONS> {
  connections: SDKSessions;
}

export interface SetConnected extends ReduxAction<ActionType.SET_CONNECTED> {
  channelId: string;
  connected: boolean;
}

export type Action =
  | UpdateConnection
  | RemoveConnection
  | AddConnection
  | ResetConnection
  | RemoveApprovedHost
  | SetApprovedHost
  | ResetApprovedHosts
  | AddAndroidConnection
  | UpdateAndroidConnection
  | RemoveAndroidConnection
  | ResetAndroidConnections
  | SetConnected;

export const updateConnection = (
  channelId: string,
  connection: ConnectionProps,
): UpdateConnection => ({
  type: ActionType.UPDATE_CONNECTION,
  channelId,
  connection,
});

export const removeConnection = (channelId: string): RemoveConnection => ({
  type: ActionType.REMOVE_CONNECTION,
  channelId,
});

export const addConnection = (
  channelId: string,
  connection: ConnectionProps,
): AddConnection => ({
  type: ActionType.ADD_CONNECTION,
  channelId,
  connection,
});

export const resetConnections = (
  connections: SDKSessions,
): ResetConnection => ({
  type: ActionType.RESET_CONNECTIONS,
  connections,
});

export const removeApprovedHost = (channelId: string): RemoveApprovedHost => ({
  type: ActionType.REMOVE_APPROVED_HOST,
  channelId,
});

export const setApprovedHost = (
  channelId: string,
  validUntil: number,
): SetApprovedHost => ({
  type: ActionType.SET_APPROVED_HOST,
  channelId,
  validUntil,
});

export const resetApprovedHosts = (
  approvedHosts: ApprovedHosts,
): ResetApprovedHosts => ({
  type: ActionType.RESET_APPROVED_HOSTS,
  approvedHosts,
});

export const addAndroidConnection = (
  channelId: string,
  connection: ConnectionProps,
): AddAndroidConnection => ({
  type: ActionType.ADD_ANDROID_CONNECTION,
  channelId,
  connection,
});

export const updateAndroidConnection = (
  channelId: string,
  connection: ConnectionProps,
): UpdateAndroidConnection => ({
  type: ActionType.UPDATE_ANDROID_CONNECTION,
  channelId,
  connection,
});

export const removeAndroidConnection = (
  channelId: string,
): RemoveAndroidConnection => ({
  type: ActionType.REMOVE_ANDROID_CONNECTION,
  channelId,
});

export const resetAndroidConnections = (
  connections: SDKSessions,
): ResetAndroidConnections => ({
  type: ActionType.RESET_ANDROID_CONNECTIONS,
  connections,
});

export const setConnected = (
  channelId: string,
  connected: boolean,
): SetConnected => ({
  type: ActionType.SET_CONNECTED,
  channelId,
  connected,
});
