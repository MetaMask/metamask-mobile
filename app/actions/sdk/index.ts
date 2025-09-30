import type { Action as ReduxAction } from 'redux';
import { ConnectionProps } from '../../core/SDKConnect/Connection';
import { ApprovedHosts, SDKSessions } from '../../core/SDKConnect/SDKConnect';
import { WC2Metadata } from './state';

export enum ActionType {
  WC2_METADATA = 'WC2_METADATA',
  RESET_CONNECTIONS = 'RESET_CONNECTIONS',
  UPDATE_CONNECTION = 'UPDATE_CONNECTION',
  REMOVE_CONNECTION = 'REMOVE_CONNECTION',
  ADD_CONNECTION = 'ADD_CONNECTION',
  DISCONNECT_ALL = 'DISCONNECT_ALL',
  REMOVE_APPROVED_HOST = 'REMOVE_APPROVWED_HOST',
  SET_APPROVED_HOST = 'SET_APPROVED_HOST',
  RESET_APPROVED_HOSTS = 'RESET_APPROVED_HOSTS',
  SET_CONNECTED = 'SET_CONNECTED',
  UPDATE_DAPP_CONNECTION = 'UPDATE_DAPP_CONNECTION',
  REMOVE_DAPP_CONNECTION = 'REMOVE_DAPP_CONNECTION',
  RESET_DAPP_CONNECTIONS = 'RESET_DAPP_CONNECTIONS',
  SET_SDK_V2_CONNECTIONS = 'SET_SDK_V2_CONNECTIONS',
}

export type DisconnectAll = ReduxAction<ActionType.DISCONNECT_ALL>;

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

export interface UpdateDappConnection
  extends ReduxAction<ActionType.UPDATE_DAPP_CONNECTION> {
  channelId: string;
  connection: ConnectionProps;
}

export interface RemoveDappConnection
  extends ReduxAction<ActionType.REMOVE_DAPP_CONNECTION> {
  channelId: string;
}

export interface ResetDappConnections
  extends ReduxAction<ActionType.RESET_DAPP_CONNECTIONS> {
  connections: SDKSessions;
}

export interface SetConnected extends ReduxAction<ActionType.SET_CONNECTED> {
  channelId: string;
  connected: boolean;
}

export interface SetSDKV2Connections
  extends ReduxAction<ActionType.SET_SDK_V2_CONNECTIONS> {
  connections: SDKSessions;
}

export interface UpdateWC2Metadata
  extends ReduxAction<ActionType.WC2_METADATA> {
  metadata?: WC2Metadata;
}

export type Action =
  | UpdateConnection
  | DisconnectAll
  | RemoveConnection
  | AddConnection
  | ResetConnection
  | RemoveApprovedHost
  | SetApprovedHost
  | ResetApprovedHosts
  | UpdateWC2Metadata
  | UpdateDappConnection
  | RemoveDappConnection
  | ResetDappConnections
  | SetConnected
  | SetSDKV2Connections;

export const disconnectAll = (): DisconnectAll => ({
  type: ActionType.DISCONNECT_ALL,
});

export const updateWC2Metadata = (
  metadata: WC2Metadata,
): UpdateWC2Metadata => ({
  type: ActionType.WC2_METADATA,
  metadata,
});

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

export const updateDappConnection = (
  channelId: string,
  connection: ConnectionProps,
): UpdateDappConnection => ({
  type: ActionType.UPDATE_DAPP_CONNECTION,
  channelId,
  connection,
});

export const removeDappConnection = (
  channelId: string,
): RemoveDappConnection => ({
  type: ActionType.REMOVE_DAPP_CONNECTION,
  channelId,
});

export const resetDappConnections = (
  connections: SDKSessions,
): ResetDappConnections => ({
  type: ActionType.RESET_DAPP_CONNECTIONS,
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

export const setSdkV2Connections = (
  connections: SDKSessions,
): SetSDKV2Connections => ({
  type: ActionType.SET_SDK_V2_CONNECTIONS,
  connections,
});
