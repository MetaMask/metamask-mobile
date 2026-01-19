/**
 * Wallet Provider Adapter Interface
 *
 * Defines the contract for mobile wallet adapters that handle
 * card tokenization and provisioning to Google Wallet.
 */

import { PlatformOSType } from 'react-native';
import {
  WalletType,
  WalletData,
  WalletEligibility,
  CardTokenStatus,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
} from '../../types';

/**
 * Interface for mobile wallet provider adapters.
 *
 * Wallet providers handle the device-side tokenization of cards.
 * This interface abstracts the wallet SDK interactions.
 *
 * Responsibilities:
 * - Check wallet availability on device
 * - Check existing card status in wallet
 * - Retrieve wallet-specific data for provisioning
 * - Handle the provisioning flow with the native SDK
 * - Listen for card activation events
 */
export interface IWalletProviderAdapter {
  /**
   * The type of wallet this adapter handles
   */
  readonly walletType: WalletType;

  /**
   * The platform this adapter is for
   */
  readonly platform: PlatformOSType;

  /**
   * Check if the wallet is available on this device
   *
   * This checks if:
   * - The device supports the wallet (hardware/software requirements)
   * - The wallet app is installed
   * - The user can add payment cards
   *
   * @returns Promise resolving to true if wallet is available
   */
  checkAvailability(): Promise<boolean>;

  /**
   * Get detailed wallet eligibility information
   *
   * This provides more details than checkAvailability(), including
   * whether a specific card is already in the wallet.
   *
   * @param lastFourDigits - Optional card last 4 digits to check for existing card
   * @returns Promise resolving to wallet eligibility details
   */
  getEligibility(lastFourDigits?: string): Promise<WalletEligibility>;

  /**
   * Check the status of a specific card in the wallet
   *
   * @param lastFourDigits - The last 4 digits of the card to check
   * @returns Promise resolving to the card's token status
   */
  getCardStatus(lastFourDigits: string): Promise<CardTokenStatus>;

  /**
   * Get the status of a card by its token identifier
   *
   * @param tokenIdentifier - The token reference ID
   * @param cardNetwork - The card network
   * @returns Promise resolving to the card's token status
   */
  getCardStatusByIdentifier(
    tokenIdentifier: string,
    cardNetwork: string,
  ): Promise<CardTokenStatus>;

  /**
   * Get wallet-specific data needed for provisioning
   *
   * For Google Wallet, this returns:
   * - deviceId: The stable hardware ID
   * - walletAccountId: The active wallet ID
   *
   * @returns Promise resolving to wallet data
   */
  getWalletData(): Promise<WalletData>;

  /**
   * Provision a card to the wallet
   *
   * This initiates the native provisioning flow which presents
   * the wallet UI to the user.
   *
   * For Android/Google Wallet:
   * - Uses the pre-encrypted opaque payment card
   * - Calls pushTokenize on the Tap and Pay SDK
   *
   * @param params - The provisioning parameters including encrypted payload
   * @returns Promise resolving to the provisioning result
   */
  provisionCard(params: ProvisionCardParams): Promise<ProvisioningResult>;

  /**
   * Resume provisioning for a card that requires activation
   *
   * If a card was previously added but requires additional
   * verification, this method resumes the provisioning flow.
   *
   * @param tokenReferenceId - The token reference ID from Google
   * @param cardNetwork - The card network
   * @param cardholderName - The cardholder's name
   * @param lastFourDigits - The last 4 digits of the card
   * @returns Promise resolving to the provisioning result
   */
  resumeProvisioning?(
    tokenReferenceId: string,
    cardNetwork: string,
    cardholderName?: string,
    lastFourDigits?: string,
  ): Promise<ProvisioningResult>;

  /**
   * List all tokens in the wallet
   *
   * @returns Promise resolving to array of token information
   */
  listTokens?(): Promise<
    {
      identifier: string;
      lastDigits: string;
      tokenState: number;
    }[]
  >;

  /**
   * Add a listener for card activation events
   *
   * The wallet SDK may emit events when a card is activated
   * after provisioning (especially for Yellow Path flows).
   *
   * @param callback - The callback to invoke on activation events
   * @returns A function to remove the listener
   */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void;
}
