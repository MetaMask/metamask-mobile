import { Connection } from '../services/connection';
import { Metadata } from './metadata';

/**
 * Defines the contract for the host MetaMask Mobile application.
 * This adapter is the sole boundary between the isolated SDKConnectV2 logic
 * and the rest of the mobile app. It allows the core logic to request
 * UI interactions and state synchronization without being coupled to any
 * specific implementation like Redux or a particular navigation service.
 */
export interface IHostApplicationAdapter {
  /**
   * Triggers the UI flow to ask the user to approve or reject a new
   * dApp connection request.
   * @param connectionId The unique ID of the connection being requested.
   * @param dappMetadata Metadata about the dApp to display to the user.
   * @returns A promise that resolves when the user has made a choice.
   */
  showConnectionApproval(
    connectionId: string,
    dappMetadata: Metadata['dapp'],
  ): Promise<void>;

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
}
