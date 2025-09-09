import { Connection } from '../services/connection';

/**
 * Defines the contract for the host MetaMask Mobile application.
 * This adapter is the sole boundary between the isolated SDKConnectV2 logic
 * and the rest of the mobile app. It allows the core logic to request
 * UI interactions and state synchronization without being coupled to any
 * specific implementation like Redux or a particular navigation service.
 */
export interface IHostApplicationAdapter {
  /**
   * Displays a global, non-interactive loading modal. Used to indicate
   * background activity, such as the cryptographic handshake.
   */
  showLoading(): void;

  /**
   * Hides the global loading modal.
   */
  hideLoading(): void;

  /**
   * Displays a global, non-interactive alert.
   * @param title The title of the alert.
   * @param message The message to display in the alert.
   */
  showAlert(title: string, message: string): void;

  /**
   * Displays a modal for the user to enter a One-Time Password (OTP).
   * @returns A promise that resolves when the user has entered the OTP.
   */
  showOTPModal(): Promise<void>;

  /**
   * Syncs the full list of active v2 connections with the application's
   * UI layer (e.g., dispatching an action to update a Redux store).
   * @param connections The complete array of active Connection objects.
   */
  syncConnectionList(connections: Connection[]): void;

  /**
   * Revokes all permissions associated with a given connection.
   * This is the host application's responsibility, as it owns the PermissionController.
   * The connection.id is the unique identifier for the connection, equivalent to the origin/channelId.
   * @param id The ID of the connection to revoke permissions for.
   */
  revokePermissions(id: string): void;
}
