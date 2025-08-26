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
}
