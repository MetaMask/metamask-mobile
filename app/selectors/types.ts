import type {
  AccountTrackerState,
  CurrencyRateState,
  NftState,
  TokenBalancesState,
  TokenListState,
  TokenRatesState,
  TokensState,
} from '@metamask/assets-controllers';
import type { SwapsState } from '@metamask/swaps-controller/dist/SwapsController';
import type { NetworkState } from '@metamask/network-controller';
import type { AddressBookState } from '@metamask/address-book-controller';
import type { BaseState } from '@metamask/base-controller';
import type { KeyringState } from '@metamask/keyring-controller';
import type { PreferencesState } from '@metamask/preferences-controller';
import type { PhishingState } from '@metamask/phishing-controller';
import type { TransactionState } from '@metamask/transaction-controller';
import type { GasFeeState } from '@metamask/gas-fee-controller';
import type { PersonalMessage, TypedMessage } from '@metamask/message-manager';
import type { Json } from '@metamask/controller-utils';

/**
 * Represents and contains data about a signing type signature request.
 *
 * TODO: Export this type from `@metamask/message-manager`.
 *
 * @property id - An id to track and identify the message object
 * @property type - The json-prc signing method for which a signature request has been made.
 * A 'Message' which always has a signing type
 * @property rawSig - Raw data of the signature request
 * @property securityProviderResponse - Response from a security provider, whether it is malicious or not
 */
export interface AbstractMessage {
  id: string;
  time: number;
  status: string;
  type: string;
  rawSig?: string;
  securityProviderResponse?: Map<string, Json>;
}

/**
 * Message Manager state
 *
 * TODO: Export this type from `@metamask/message-manager`.
 *
 * @property unapprovedMessages - A collection of all Messages in the 'unapproved' state
 * @property unapprovedMessagesCount - The count of all Messages in this.unapprovedMessages
 */
export interface MessageManagerState<M extends AbstractMessage>
  extends BaseState {
  unapprovedMessages: { [key: string]: M };
  unapprovedMessagesCount: number;
}

export interface EngineState {
  engine: {
    backgroundState: {
      AccountTrackerController: AccountTrackerState;
      AddressBookController: AddressBookState;
      AssetsContractController: BaseState;
      CurrencyRateController: CurrencyRateState;
      GasFeeController: GasFeeState;
      KeyringController: KeyringState;
      NetworkController: NetworkState;
      NftController: NftState;
      NftDetectionController: BaseState;
      PersonalMessageManager: MessageManagerState<PersonalMessage>;
      PhishingController: PhishingState;
      PreferencesController: PreferencesState;
      SwapsController: SwapsState;
      TokenBalancesController: TokenBalancesState;
      TokenDetectionController: BaseState;
      TokenListController: TokenListState;
      TokenRatesController: TokenRatesState;
      TokensController: TokensState;
      TransactionController: TransactionState;
      TypedMessageManager: MessageManagerState<TypedMessage>;
    };
  };
}
